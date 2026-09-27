/**
 * Development-only auth fallback.
 *
 * Lets you sign in and reach /admin before a Supabase project exists, so the
 * UI can be reviewed locally. Unlike the localStorage approach, this uses a
 * cookie, because the /admin gate runs in middleware and a server layout where
 * localStorage is not readable.
 *
 * ── Why this cannot leak into production ────────────────────────────────────
 * It is gated on BOTH conditions, and either one alone disables it:
 *   1. NODE_ENV !== "production"  — `next build` / `next start` set production.
 *   2. Supabase is NOT configured — the moment you add real keys, this is off.
 * So a deployed build can never honour the cookie, and neither can a local dev
 * server once it has credentials.
 */

export const DEV_SESSION_COOKIE = "kelmon-dev-session";

/** Emails that get the admin role in the dev fallback. */
const DEV_ADMIN_EMAILS = [
  "admin@gmail.com",
  "info@globalsolutionsug.com",
];

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** True only when the dev fallback is allowed to do anything at all. */
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !supabaseConfigured();
}

export interface DevSession {
  email: string;
  name: string;
  role: "customer" | "admin";
}

export function devRoleFor(email: string): "customer" | "admin" {
  return DEV_ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? "admin" : "customer";
}

export function buildDevSession(email: string, name?: string): DevSession {
  const clean = email.trim().toLowerCase();
  return {
    email: clean,
    name: name?.trim() || clean.split("@")[0],
    role: devRoleFor(clean),
  };
}

/** Parses the cookie value. Returns null when disabled or malformed. */
export function parseDevSession(raw: string | undefined): DevSession | null {
  if (!isDevAuthEnabled() || !raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<DevSession>;
    if (!parsed.email) return null;
    // Re-derive the role from the email rather than trusting the cookie, so
    // hand-editing it to {"role":"admin"} grants nothing.
    return buildDevSession(parsed.email, parsed.name);
  } catch {
    return null;
  }
}

export function isDevAdmin(raw: string | undefined): boolean {
  return parseDevSession(raw)?.role === "admin";
}

/** The admin emails, for messaging in the sign-in UI. */
export function devAdminEmails(): string[] {
  return [...DEV_ADMIN_EMAILS];
}
