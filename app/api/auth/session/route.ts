import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  bootstrapAdminEmails,
  createSessionCookie,
  isFirebaseAdminConfigured,
  syncClaims,
  verifyIdToken,
  verifySessionCookie,
} from "@/lib/firebase/admin";
import { isProtectedAccount } from "@/lib/auth/protected-accounts";
import {
  ID_TOKEN_COOKIE,
  ID_TOKEN_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/firebase/cookie";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { parseInput, sessionRequestSchema } from "@/lib/validation/schemas";

/**
 * Bridges the Firebase session in the browser to the server and to Supabase.
 *
 * POST is called by AuthProvider on sign-in and on every token refresh. It
 *   1. verifies the ID token,
 *   2. decides whether the user is an admin,
 *   3. writes the `role` and `admin` custom claims Postgres RLS reads,
 *   4. makes sure a profiles row exists, and
 *   5. mirrors the token into an httpOnly cookie for the server to read, and
 *   6. keeps a two-week session cookie alongside it, so the server still knows
 *      the user after the hour-long ID token has lapsed.
 *
 * DELETE clears both cookies on sign-out.
 *
 * Admin precedence, highest first: the ADMIN_EMAILS allowlist (plus the owner),
 * then profiles.role (managed on the admin Accounts page), and the existing
 * claim only when there is no profile yet. The allowlist is how the first admin
 * comes to exist at all — the claim cannot be self-granted and profiles.role is
 * not client-writable.
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  // Shape check only — three base64url segments. It turns a junk body into a 400
  // without the Admin SDK doing crypto first, and decides nothing about trust.
  const parsed = parseInput(sessionRequestSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { idToken } = parsed.data;

  // This is the line that actually establishes identity.
  const decoded = await verifyIdToken(idToken);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  const email = decoded.email?.toLowerCase() ?? null;
  const bootstrap = bootstrapAdminEmails().includes(email ?? "");
  let admin = bootstrap || decoded.admin === true;
  let superAdmin = isProtectedAccount(email);

  // Keep Postgres and Firebase in step. Without Supabase configured the claims
  // still get written, so the admin gate works before the database exists.
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createServiceClient();

      const { data: existing } = await db
        .from("profiles")
        .select("role, super_admin, full_name, avatar_url")
        .eq("id", decoded.uid)
        .maybeSingle();

      // Once a profile exists it decides: a demoted admin's token still says
      // `admin: true` until it expires, and must not re-promote them here.
      if (existing) {
        admin = bootstrap || existing.role === "admin";
        superAdmin ||= existing.role === "admin" && existing.super_admin === true;
      }

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
    superAdmin,
    // The token just verified predates any claim written above. Claims only
    // reach Postgres inside a freshly minted token, so tell the client to force
    // a refresh and post again.
    refreshRequired: claimsChanged,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  response.cookies.set({
    ...cookieOptions,
    name: ID_TOKEN_COOKIE,
    value: idToken,
    maxAge: ID_TOKEN_MAX_AGE,
  });

  // Minting costs a round trip to Google, so only when the current session
  // cookie is missing, expired, belongs to someone else, or carries a stale
  // admin claim (it snapshots claims when minted). The hourly token refresh
  // otherwise leaves it alone.
  const store = await cookies();
  const existing = await verifySessionCookie(store.get(SESSION_COOKIE)?.value);
  const stale =
    !existing || existing.uid !== decoded.uid || (existing.admin === true) !== (decoded.admin === true);
  if (stale) {
    try {
      response.cookies.set({
        ...cookieOptions,
        name: SESSION_COOKIE,
        value: await createSessionCookie(idToken, SESSION_MAX_AGE),
        maxAge: SESSION_MAX_AGE,
      });
    } catch (err) {
      // The ID token cookie above still works for the next hour.
      console.error("[auth/session] session cookie:", err);
    }
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ID_TOKEN_COOKIE);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
