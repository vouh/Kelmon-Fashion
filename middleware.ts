import { NextResponse, type NextRequest } from "next/server";
import { ID_TOKEN_COOKIE, SESSION_COOKIE, peekIdToken } from "@/lib/firebase/cookie";

/**
 * First-pass gate for /admin, plus the redirect away from /signin for users who
 * are already signed in.
 *
 * **Not the authorisation boundary.** Middleware runs on the Edge runtime,
 * where the Firebase Admin SDK cannot load, so the token is only decoded here,
 * never verified. A forged cookie gets past this and is then stopped twice:
 * app/admin/layout.tsx verifies the signature with the Admin SDK before any
 * admin markup renders, and Postgres RLS rejects every query the forged claim
 * would have unlocked.
 *
 * What this does buy is the redirect happening before a page is rendered at
 * all, which is what the old client-side admin/admin-auth.js overlay could not
 * do — it shipped the admin HTML to the browser and then hid it.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // The live ID token if there is one, else the two-week session cookie — both
  // JWTs, so the same unverified peek reads either.
  const idToken = peekIdToken(request.cookies.get(ID_TOKEN_COOKIE)?.value);
  const token =
    idToken && !idToken.expired
      ? idToken
      : peekIdToken(request.cookies.get(SESSION_COOKIE)?.value);
  const signedIn = token !== null && !token.expired;

  if (pathname.startsWith("/admin")) {
    if (!signedIn) {
      // Includes the expired-token case: the client holds a Firebase refresh
      // token, so /signin can mint a new ID token and send the user straight
      // back to where they were headed.
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/signin";
      redirect.search = "";
      redirect.searchParams.set("next", pathname);
      return NextResponse.redirect(redirect);
    }

    if (!token.admin) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/";
      redirect.search = "";
      redirect.searchParams.set("error", "not-authorized");
      return NextResponse.redirect(redirect);
    }
  }

  // Signed-in users have no reason to see the sign-in page. Admins land on the
  // dashboard; everyone else on their account. Only on a real navigation: the
  // router.refresh() AuthProvider fires right after sign-in is an RSC fetch,
  // and redirecting it would yank an admin off the "where to?" prompt.
  if (pathname === "/signin" && signedIn && request.headers.get("RSC") !== "1") {
    const next = request.nextUrl.searchParams.get("next");
    const redirect = request.nextUrl.clone();
    redirect.pathname =
      next?.startsWith("/") && !next.startsWith("//") ? next : token.admin ? "/admin" : "/profile";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets — matching on images
     * would triple the middleware invocations for no benefit.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
