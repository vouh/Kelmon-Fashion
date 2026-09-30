import { NextResponse } from "next/server";

import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getEmailSettings, resend } from "@/lib/email/resend";
import { passwordResetEmail, siteOrigin } from "@/lib/email/templates";
import { EMAIL_PATTERN } from "@/lib/validation/credentials";

export const runtime = "nodejs";

const COOLDOWN_MS = 60_000;
const recentRequests = new Map<string, number>();

/**
 * This endpoint says whether an email has an account, so cap how many lookups
 * one address can make — enough for typos, not for checking a list of emails.
 * Per server instance, like the cooldown above.
 */
const LOOKUP_WINDOW_MS = 10 * 60_000;
const MAX_LOOKUPS = 10;
const lookupsByIp = new Map<string, number[]>();

function tooManyLookups(ip: string): boolean {
  const now = Date.now();
  for (const [key, times] of lookupsByIp) {
    const recent = times.filter((at) => now - at < LOOKUP_WINDOW_MS);
    if (recent.length === 0) lookupsByIp.delete(key);
    else lookupsByIp.set(key, recent);
  }
  const times = lookupsByIp.get(ip) ?? [];
  if (times.length >= MAX_LOOKUPS) return true;
  lookupsByIp.set(ip, [...times, now]);
  return false;
}

function isOnCooldown(email: string): boolean {
  const now = Date.now();
  for (const [key, at] of recentRequests) {
    if (now - at > COOLDOWN_MS) recentRequests.delete(key);
  }
  if (recentRequests.has(email)) return true;
  recentRequests.set(email, now);
  return false;
}

export async function POST(request: Request) {
  const settings = getEmailSettings();
  const origin = siteOrigin(request);

  if (!settings.canSendToCustomers || !resend || !settings.from || !isFirebaseAdminConfigured() || !origin) {
    return NextResponse.json(
      { error: "Password reset is not available right now. Please try again later." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawEmail = (body as { email?: unknown } | null)?.email;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyLookups(ip)) {
    return NextResponse.json(
      { error: "Too many reset requests. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const ok = NextResponse.json({ ok: true });
  const failed = () => {
    recentRequests.delete(email);
    return NextResponse.json({ error: "We could not send the reset email. Please try again." }, { status: 502 });
  };

  // Check the account exists before anything else, and say so when it doesn't:
  // no email is sent (and no Resend credit used) for an unknown address.
  // With email enumeration protection on, generatePasswordResetLink doesn't
  // report unknown emails as not found; it fails with an internal error instead.
  try {
    await getAdminAuth().getUserByEmail(email);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "There's no Kelmon account with this email. Check the spelling, or create an account." },
        { status: 404 },
      );
    }
    console.error("Looking up user for password reset failed", error);
    return failed();
  }

  // A link already went to this email in the last minute; don't send another.
  if (isOnCooldown(email)) return ok;

  let oobCode: string | null;
  try {
    const firebaseLink = await getAdminAuth().generatePasswordResetLink(email);
    oobCode = new URL(firebaseLink).searchParams.get("oobCode");
  } catch (error) {
    console.error("Generating password reset link failed", error);
    return failed();
  }

  if (!oobCode) {
    console.error("Password reset link had no oobCode");
    return failed();
  }

  const link = `${origin}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;

  const { error } = await resend.emails.send({
    from: settings.from,
    to: email,
    ...passwordResetEmail(link, origin),
  });

  if (error) {
    console.error("Resend password reset email failed", error);
    return failed();
  }

  return ok;
}
