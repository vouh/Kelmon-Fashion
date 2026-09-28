import { cookies } from "next/headers";
import { verifyIdToken, verifySessionCookie } from "@/lib/firebase/admin";
import { ID_TOKEN_COOKIE, SESSION_COOKIE } from "@/lib/firebase/cookie";

/**
 * The server's verified view of who is signed in.
 *
 * The token comes from the cookie described in lib/firebase/cookie.ts; this
 * module is the half that verifies it, so it may only be imported from Node
 * runtime code — server components, route handlers, server actions.
 *
 * Identity comes from the hour-long ID token when it is still live, and from
 * the two-week session cookie otherwise, so someone who was away longer than an
 * hour is still recognised. `source` says which: only a live ID token reaches
 * Supabase, so code that needs RLS on a "session" identity must scope its
 * queries itself (see createCallerClient in lib/supabase/server.ts).
 */
export interface Identity {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  admin: boolean;
  source: "token" | "session";
}

/** The raw ID token, for handing to Supabase. Not verified by this function. */
export async function getIdTokenCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ID_TOKEN_COOKIE)?.value;
}

/** The verified caller, or null when neither cookie holds a valid credential. */
export async function getIdentity(): Promise<Identity | null> {
  let source: Identity["source"] = "token";
  let decoded = await verifyIdToken(await getIdTokenCookie());
  if (!decoded) {
    const store = await cookies();
    decoded = await verifySessionCookie(store.get(SESSION_COOKIE)?.value);
    source = "session";
  }
  if (!decoded) return null;

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: (decoded.name as string | undefined) ?? null,
    picture: (decoded.picture as string | undefined) ?? null,
    admin: decoded.admin === true,
    source,
  };
}
