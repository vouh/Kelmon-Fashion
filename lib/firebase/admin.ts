import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { PROTECTED_SUPER_ADMIN_EMAILS, isProtectedAccount } from "@/lib/auth/protected-accounts";

/**
 * Firebase Admin SDK — the trusted half of authentication.
 *
 * Three jobs, none of which the browser may do for itself:
 *   1. Verify the ID token a client presents (signature, expiry, issuer).
 *   2. Write custom claims, including the `role` claim Supabase requires.
 *   3. Look users up by email so the first admin can be bootstrapped.
 *
 * Never import this from a Client Component — it carries the private key.
 */

/** Service-account credentials, from either supported env shape. */
function readCredentials():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  // Shape 1: the whole downloaded JSON in one variable, raw or base64.
  const blob = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (blob?.trim()) {
    try {
      const text = blob.trim().startsWith("{")
        ? blob
        : Buffer.from(blob, "base64").toString("utf8");
      const parsed = JSON.parse(text) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      console.error("[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
    return null;
  }

  // Shape 2: the three fields separately. Dotenv keeps "\n" literal, so the
  // private key arrives as one line and has to be unescaped before use.
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ?? process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
  };
}

export function isFirebaseAdminConfigured(): boolean {
  return readCredentials() !== null;
}

const ADMIN_APP = "kelmon-admin";

export function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP);
  if (existing) return existing;

  const credentials = readCredentials();
  if (!credentials) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON, or " +
        "FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (or their FIREBASE_ADMIN_* equivalents)."
    );
  }

  return initializeApp({ credential: cert(credentials), projectId: credentials.projectId }, ADMIN_APP);
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminFirestore(): Firestore | null {
  if (!isFirebaseAdminConfigured()) return null;
  return getFirestore(getAdminApp());
}

/**
 * Verifies an ID token. Returns null rather than throwing for the ordinary
 * cases — expired, malformed, absent — because callers treat all of them as
 * "not signed in".
 *
 * `checkRevoked` is deliberately off: it costs a network round trip on every
 * request, and sign-out already clears the cookie. Pass true where revocation
 * must be honoured immediately.
 */
export async function verifyIdToken(
  token: string | undefined,
  checkRevoked = false
): Promise<DecodedIdToken | null> {
  if (!token || !isFirebaseAdminConfigured()) return null;
  try {
    return await getAdminAuth().verifyIdToken(token, checkRevoked);
  } catch {
    return null;
  }
}

/** Mints a two-week Firebase session cookie from a verified ID token. */
export async function createSessionCookie(idToken: string, maxAgeSeconds: number): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, { expiresIn: maxAgeSeconds * 1000 });
}

/** Verifies a session cookie. Null for absent, expired or invalid, as above. */
export async function verifySessionCookie(
  cookie: string | undefined,
  checkRevoked = false
): Promise<DecodedIdToken | null> {
  if (!cookie || !isFirebaseAdminConfigured()) return null;
  try {
    return await getAdminAuth().verifySessionCookie(cookie, checkRevoked);
  } catch {
    return null;
  }
}

// ── Custom claims ───────────────────────────────────────────────────────────

/**
 * Claims Kelmon puts on every user.
 *
 * `role` is not optional cosmetics: Supabase's third-party auth hands the JWT
 * to PostgREST, which reads `role` to decide which Postgres role the request
 * runs as. A Firebase token without it is treated as anonymous, and every RLS
 * policy that expects a signed-in user fails closed.
 *
 * `admin` is ours, and is what `is_admin()` reads inside Postgres.
 */
export interface KelmonClaims {
  role: "authenticated";
  admin?: boolean;
}

/**
 * Emails granted admin on sign-in, so the first admin can exist at all. The
 * protected super admins are always included, whatever ADMIN_EMAILS says.
 */
export function bootstrapAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...PROTECTED_SUPER_ADMIN_EMAILS, ...fromEnv])];
}

/**
 * Brings a user's custom claims in line with what they should be, and reports
 * whether anything changed — a changed claim only reaches Postgres after the
 * client refreshes its ID token, so the caller needs to know to force one.
 */
export async function syncClaims(
  uid: string,
  desired: { admin: boolean }
): Promise<{ changed: boolean; claims: KelmonClaims }> {
  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  const current = (user.customClaims ?? {}) as Partial<KelmonClaims>;

  const claims: KelmonClaims = { role: "authenticated", admin: desired.admin };
  const changed = current.role !== claims.role || Boolean(current.admin) !== claims.admin;

  if (changed) {
    await auth.setCustomUserClaims(uid, claims);
  }
  return { changed, claims };
}

/**
 * Grants or revokes admin. Used by the Accounts page. A revocation also signs
 * the user out everywhere, so no still-valid token keeps admin rights; a grant
 * is picked up on their next sign-in or token refresh.
 */
export async function setAdminClaim(uid: string, admin: boolean): Promise<void> {
  if (!admin) await assertNotProtected(uid);
  await getAdminAuth().setCustomUserClaims(uid, { role: "authenticated", admin });
  if (!admin) await getAdminAuth().revokeRefreshTokens(uid);
}

/** Throws for the owner account, before anything destructive runs. */
export async function assertNotProtected(uid: string): Promise<void> {
  const user = await getAdminAuth().getUser(uid);
  if (isProtectedAccount(user.email)) {
    throw new Error("The main super admin account is protected and cannot be removed or demoted.");
  }
}

/** Deletes a Firebase account, refusing the protected super admins. */
export async function deleteAuthUser(uid: string): Promise<void> {
  await assertNotProtected(uid);
  await getAdminAuth().deleteUser(uid);
}

export async function findUidByEmail(email: string): Promise<string | null> {
  try {
    const user = await getAdminAuth().getUserByEmail(email.trim().toLowerCase());
    return user.uid;
  } catch {
    return null;
  }
}
