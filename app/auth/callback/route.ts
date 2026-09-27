import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / magic-link landing route.
 *
 * Google redirects here with a one-time `code`, which we exchange for a session
 * and store in cookies. Configure this URL in the Supabase dashboard under
 * Authentication -> URL Configuration -> Redirect URLs:
 *   http://localhost:3000/auth/callback
 *   https://<your-domain>/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  // Only allow same-site redirects — an absolute `next` could bounce a freshly
  // signed-in user to an attacker's page.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/profile";

  if (oauthError) {
    return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
