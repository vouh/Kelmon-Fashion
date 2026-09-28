import { NextResponse } from "next/server";

import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getEmailSettings, resend } from "@/lib/email/resend";
import { passwordResetEmail, siteOrigin } from "@/lib/email/templates";

export const runtime = "nodejs";

const COOLDOWN_MS = 60_000;
const recentRequests = new Map<string, number>();

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

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // The same response whether or not the account exists, so this endpoint can't
  // be used to discover who has a Kelmon account.
  const ok = NextResponse.json({ ok: true });

  if (isOnCooldown(email)) return ok;

  const failed = () => {
    recentRequests.delete(email);
    return NextResponse.json({ error: "We could not send the reset email. Please try again." }, { status: 502 });
  };

  // With email enumeration protection on, generatePasswordResetLink doesn't
  // report unknown emails as not found; it fails with an internal error instead.
  try {
    await getAdminAuth().getUserByEmail(email);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code === "auth/user-not-found") return ok;
    console.error("Looking up user for password reset failed", error);
    return failed();
  }

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
