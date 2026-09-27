import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request, and gates /admin.
 *
 * The old admin/admin-auth.js did this client-side: it injected a full-screen
 * overlay, waited for Firebase's auth-changed event, then compared the email
 * against a hardcoded list. The page HTML still shipped to the browser. Here
 * the check happens before any admin markup is rendered.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured, let everything through except /admin so the
  // storefront still runs on a bare checkout.
  if (!url || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/";
      redirect.searchParams.set("error", "supabase-not-configured");
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touch getUser() so an expired access token is refreshed and the new cookie
  // is written onto the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/signin";
      redirect.searchParams.set("next", pathname);
      return NextResponse.redirect(redirect);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/";
      redirect.searchParams.set("error", "not-authorized");
      return NextResponse.redirect(redirect);
    }
  }

  // Signed-in users have no reason to see the sign-in page.
  if (pathname === "/signin" && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/profile";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
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
