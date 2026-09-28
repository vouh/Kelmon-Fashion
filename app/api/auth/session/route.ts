import { NextResponse } from "next/server";
import {
  bootstrapAdminEmails,
  isFirebaseAdminConfigured,
  syncClaims,
  verifyIdToken,
} from "@/lib/firebase/admin";
import { ID_TOKEN_COOKIE, ID_TOKEN_MAX_AGE } from "@/lib/firebase/cookie";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Bridges the Firebase session in the browser to the server and to Supabase.
 *
 * POST is called by AuthProvider on sign-in and on every token refresh. It
 *   1. verifies the ID token,
 *   2. decides whether the user is an admin,
 *   3. writes the `role` and `admin` custom claims Postgres RLS reads,
 *   4. makes sure a profiles row exists, and
 *   5. mirrors the token into an httpOnly cookie for the server to read.
 *
 * DELETE clears the cookie on sign-out.
 *
 * Admin precedence, highest first: the ADMIN_EMAILS allowlist, then an existing
 * `admin` role in profiles (granted through the admin panel), then an existing
 * claim. The allowlist is how the first admin comes to exist at all — the
 * claim cannot be self-granted and profiles.role is not client-writable.
 */

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin is not configured on the server. Add the service-account " +
          "credentials to .env.local (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).",
      },
      { status: 503 }
    );
  }

  let idToken: string | undefined;
  try {
    ({ idToken } = (await request.json()) as { idToken?: string });
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const decoded = await verifyIdToken(idToken);
  if (!decoded || !idToken) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  const email = decoded.email?.toLowerCase() ?? null;
  let admin = bootstrapAdminEmails().includes(email ?? "") || decoded.admin === true;

  // Keep Postgres and Firebase in step. Without Supabase configured the claims
  // still get written, so the admin gate works before the database exists.
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createServiceClient();

      const { data: existing } = await db
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", decoded.uid)
        .maybeSingle();

      if (existing?.role === "admin") admin = true;

      if (existing) {
        // Email and role come from the identity provider and the allowlist, so
        // they are refreshed. Name and avatar are the user's own to edit, and
        // are only filled in when still blank.
        await db
          .from("profiles")
          .update({
            email,
            role: admin ? "admin" : existing.role,
            full_name: existing.full_name ?? decoded.name ?? email?.split("@")[0] ?? null,
            avatar_url: existing.avatar_url ?? decoded.picture ?? null,
          })
          .eq("id", decoded.uid);
      } else {
        await db.from("profiles").insert({
          id: decoded.uid,
          email,
          full_name: decoded.name ?? email?.split("@")[0] ?? null,
          avatar_url: decoded.picture ?? null,
          role: admin ? "admin" : "customer",
        });
      }
    } catch (err) {
      // A profile that cannot be written must not block sign-in; the user is
      // authenticated either way and the next request retries.
      console.error("[auth/session] profile sync:", err);
    }
  }

  let claimsChanged = false;
  try {
    ({ changed: claimsChanged } = await syncClaims(decoded.uid, { admin }));
  } catch (err) {
    console.error("[auth/session] claim sync:", err);
  }

  const response = NextResponse.json({
    uid: decoded.uid,
    admin,
    // The token just verified predates any claim written above. Claims only
    // reach Postgres inside a freshly minted token, so tell the client to force
    // a refresh and post again.
    refreshRequired: claimsChanged,
  });

  response.cookies.set({
    name: ID_TOKEN_COOKIE,
    value: idToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ID_TOKEN_MAX_AGE,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ID_TOKEN_COOKIE);
  return response;
}
