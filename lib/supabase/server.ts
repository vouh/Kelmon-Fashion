import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";
import {
  DEV_SESSION_COOKIE,
  isDevAdmin,
  isDevAuthEnabled,
  parseDevSession,
} from "@/lib/dev-auth";

/**
 * Server Supabase client, scoped to the caller's session cookies.
 * Every query it runs is subject to RLS as the signed-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled by middleware.ts instead.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Bypasses RLS entirely — only for trusted server paths
 * that must write on the user's behalf, such as the M-Pesa callback promoting
 * an order to 'paid'.
 *
 * Never import this into a Client Component.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** The signed-in user, or null. */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** The signed-in user's profile row, or null. */
export async function getCurrentProfile() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  return data ?? null;
}

/**
 * True when the caller is an admin. Reads the role from the database rather
 * than trusting a claim, and is the server-side equivalent of the
 * hardcoded ADMIN_EMAILS list in the old admin/admin-auth.js.
 *
 * Falls back to the development session cookie only when Supabase is
 * unconfigured and NODE_ENV is not production (see lib/dev-auth.ts).
 */
export async function isAdmin(): Promise<boolean> {
  if (isDevAuthEnabled()) {
    const cookieStore = await cookies();
    return isDevAdmin(cookieStore.get(DEV_SESSION_COOKIE)?.value);
  }
  const profile = await getCurrentProfile();
  return profile?.role === "admin";
}

/** The signed-in admin's email, for display in the admin shell. */
export async function getAdminEmail(): Promise<string | null> {
  if (isDevAuthEnabled()) {
    const cookieStore = await cookies();
    return parseDevSession(cookieStore.get(DEV_SESSION_COOKIE)?.value)?.email ?? null;
  }
  const profile = await getCurrentProfile();
  return profile?.email ?? null;
}
