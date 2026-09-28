import { cookies } from "next/headers";
import { verifyIdToken } from "@/lib/firebase/admin";
import { ID_TOKEN_COOKIE } from "@/lib/firebase/cookie";

/**
 * The server's verified view of who is signed in.
 *
 * The token comes from the cookie described in lib/firebase/cookie.ts; this
 * module is the half that verifies it, so it may only be imported from Node
 * runtime code — server components, route handlers, server actions.
 *
 * One consequence to know about: ID tokens expire after an hour, so a cold page
 * load by someone who has been away longer renders as signed out until the
 * client refreshes the cookie. AuthProvider posts a fresh token on mount, and
 * middleware bounces protected routes through /signin, which does the same.
 */
export interface Identity {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  admin: boolean;
}

/** The raw ID token, for handing to Supabase. Not verified by this function. */
export async function getIdTokenCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ID_TOKEN_COOKIE)?.value;
}

/** The verified caller, or null when the token is absent, expired or invalid. */
export async function getIdentity(): Promise<Identity | null> {
  const decoded = await verifyIdToken(await getIdTokenCookie());
  if (!decoded) return null;

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: (decoded.name as string | undefined) ?? null,
    picture: (decoded.picture as string | undefined) ?? null,
    admin: decoded.admin === true,
  };
}
