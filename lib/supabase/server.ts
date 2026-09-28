import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "@/lib/supabase/types";
import { getIdentity, getIdTokenCookie, type Identity } from "@/lib/firebase/session";

/**
 * Server-side Supabase access, authenticated by the Firebase ID token that
 * AuthProvider mirrors into an httpOnly cookie.
 *
 * There is no Supabase session to refresh here and no auth cookies to shuttle
 * around, which is why this no longer uses @supabase/ssr: the only credential
 * is the bearer token, and Firebase owns its lifecycle.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const token = await getIdTokenCookie();

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Resolved per request. Null means anonymous, and RLS treats it that way.
      accessToken: async () => token ?? null,
    }
  );
}

/**
 * Service-role client. Bypasses RLS entirely — only for trusted server paths
 * that must write on the user's behalf, such as the M-Pesa callback promoting
 * an order to 'paid', or the sign-in route creating a profiles row.
 *
 * Never import this into a Client Component.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A client for the caller's own rows. With a live ID token that is the normal
 * RLS client. When only the session cookie is left (the ID token expired while
 * the tab was closed), Supabase would see an anonymous request, so this falls
 * back to the service role — **callers must scope every query to identity.uid
 * themselves**, since RLS no longer does it for them.
 */
export async function createCallerClient(identity: Identity): Promise<SupabaseClient<Database>> {
  if (identity.source === "token" || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient();
  }
  return createServiceClient();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** The verified Firebase identity behind this request, or null. */
export async function getCurrentUser(): Promise<Identity | null> {
  return getIdentity();
}

/** The signed-in user's profile row, or null. */
export async function getCurrentProfile(): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured()) return null;

  const identity = await getIdentity();
  if (!identity) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", identity.uid)
    .maybeSingle();

  return data ?? null;
}

/**
 * True when the caller is an admin.
 *
 * The `admin` custom claim is checked first because it is already in the
 * verified token — no database round trip, and it works before Supabase is
 * configured. profiles.role is the fallback for the window between an admin
 * being granted in the panel and the user's next token refresh.
 */
export async function isAdmin(): Promise<boolean> {
  const identity = await getIdentity();
  if (!identity) return false;
  if (identity.admin) return true;

  const profile = await getCurrentProfile();
  return profile?.role === "admin";
}

/** The signed-in admin's email, for display in the admin shell. */
export async function getAdminEmail(): Promise<string | null> {
  const identity = await getIdentity();
  return identity?.email ?? null;
}
