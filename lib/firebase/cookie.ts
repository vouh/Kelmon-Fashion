/**
 * The auth cookie's name, lifetime, and an unverified peek at its contents.
 *
 * Deliberately dependency-free: middleware runs on the Edge runtime, where the
 * Admin SDK's Node crypto cannot load. Anything middleware imports has to stay
 * this light, which is why these live apart from lib/firebase/session.ts.
 */

/**
 * Firebase keeps its session in IndexedDB, which the server cannot read, so the
 * client mirrors its ID token here on sign-in and on every refresh.
 *
 * An ID token rather than a Firebase session cookie, because Supabase's
 * third-party auth only accepts tokens issued by
 * `securetoken.google.com/<project>` and a session cookie has a different
 * issuer — and this same token is what Supabase receives.
 */
export const ID_TOKEN_COOKIE = "kelmon-token";

/** An ID token's lifetime. The client refreshes well before this. */
export const ID_TOKEN_MAX_AGE = 60 * 60;

export interface TokenPeek {
  sub: string;
  email: string | null;
  admin: boolean;
  expired: boolean;
}

/**
 * Reads a JWT's payload **without verifying its signature**.
 *
 * Only ever safe for deciding a redirect. Anything forged gets past this and is
 * then rejected by the real check — `verifyIdToken()` in the /admin layout, and
 * RLS in Postgres, both of which validate the signature. Never use this to
 * authorise a read or a write.
 */
export function peekIdToken(token: string | undefined): TokenPeek | null {
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as {
      sub?: string;
      email?: string;
      admin?: boolean;
      exp?: number;
    };
    if (!claims.sub) return null;

    return {
      sub: claims.sub,
      email: claims.email ?? null,
      admin: claims.admin === true,
      expired: typeof claims.exp === "number" && claims.exp * 1000 <= Date.now(),
    };
  } catch {
    return null;
  }
}
