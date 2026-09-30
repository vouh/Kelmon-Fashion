import { createHash, randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getEmailSettings, resend } from "@/lib/email/resend";
import { signupVerificationEmail, siteOrigin } from "@/lib/email/templates";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { EMAIL_PATTERN } from "@/lib/validation/credentials";

export const runtime = "nodejs";

const EXPIRY_MS = 10 * 60_000;
const COOLDOWN_MS = 60_000;

const hashCode = (id: string, code: string) =>
  createHash("sha256").update(`${id}:${code}`).digest("hex");

export async function POST(request: Request) {
  const settings = getEmailSettings();
  if (!settings.canSendToCustomers || !resend || !settings.from || !isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Email verification is unavailable right now." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await getAdminAuth().getUserByEmail(email);
    return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") {
      console.error("Sign-up email lookup failed", error);
      return NextResponse.json({ error: "We could not start verification. Please try again." }, { status: 502 });
    }
  }

  const supabase = createServiceClient();
  const { data: recent } = await supabase
    .from("signup_email_codes")
    .select("created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < COOLDOWN_MS) {
    return NextResponse.json({ error: "Please wait one minute before requesting another code." }, { status: 429 });
  }

  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error: insertError } = await supabase.from("signup_email_codes").insert({
    id,
    email,
    code_hash: hashCode(id, code),
    expires_at: new Date(Date.now() + EXPIRY_MS).toISOString(),
  });
  if (insertError) {
    console.error("Creating sign-up code failed", insertError);
    return NextResponse.json({ error: "We could not start verification. Please try again." }, { status: 502 });
  }

  // The same code, carried in a link: clicking it verifies without typing.
  const origin = siteOrigin(request);
  const link = origin
    ? `${origin}/verify-email?id=${encodeURIComponent(id)}&code=${encodeURIComponent(code)}`
    : null;
  const { error: sendError } = await resend.emails.send({
    from: settings.from,
    to: email,
    ...signupVerificationEmail(code, origin, link),
  });
  if (sendError) {
    await supabase.from("signup_email_codes").delete().eq("id", id);
    console.error("Sending sign-up code failed", sendError);
    return NextResponse.json({ error: "We could not send the verification code. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ challengeId: id, expiresInSeconds: EXPIRY_MS / 1000 });
}
