import { NextResponse } from "next/server";
import {
  DEV_SESSION_COOKIE,
  buildDevSession,
  isDevAuthEnabled,
} from "@/lib/dev-auth";

/**
 * Sets or clears the development sign-in cookie.
 * Returns 404 when the dev fallback is disabled, so the endpoint does not even
 * exist in a real deployment.
 */

export async function POST(request: Request) {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { email, name } = (await request.json()) as { email?: string; name?: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const session = buildDevSession(email, name);
  const response = NextResponse.json({ ok: true, session });

  response.cookies.set({
    name: DEV_SESSION_COOKIE,
    value: encodeURIComponent(JSON.stringify(session)),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

export async function DELETE() {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DEV_SESSION_COOKIE);
  return response;
}
