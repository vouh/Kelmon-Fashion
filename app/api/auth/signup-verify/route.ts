import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { EMAIL_PATTERN, passwordProblem } from "@/lib/validation/credentials";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const hashCode = (id: string, code: string) =>
  createHash("sha256").update(`${id}:${code}`).digest("hex");

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Account creation is unavailable right now." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as {
    challengeId?: unknown;
    code?: unknown;
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
  } | null;
  const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the six-digit code from your email." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email) || !fullName || fullName.length > 120 || passwordProblem(password)) {
    return NextResponse.json({ error: "Your registration details are invalid. Please start again." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: challenge, error } = await supabase
    .from("signup_email_codes")
    .select("*")
    .eq("id", challengeId)
    .maybeSingle();
  if (error || !challenge || challenge.email !== email || challenge.used_at) {
    return NextResponse.json({ error: "This verification code is invalid. Please request a new one." }, { status: 400 });
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "This verification code has expired. Please request a new one." }, { status: 400 });
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many incorrect attempts. Please request a new code." }, { status: 429 });
  }

  const actual = Buffer.from(hashCode(challengeId, code), "hex");
  const expected = Buffer.from(challenge.code_hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    await supabase.from("signup_email_codes").update({ attempts: challenge.attempts + 1 }).eq("id", challengeId);
    return NextResponse.json({ error: "That code is incorrect. Please check the email and try again." }, { status: 400 });
  }

  try {
    await getAdminAuth().createUser({ email, password, displayName: fullName, emailVerified: true });
  } catch (createError) {
    const code = (createError as { code?: string }).code ?? "";
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
    }
    console.error("Creating verified Firebase user failed", createError);
    return NextResponse.json({ error: "We could not create the account. Please try again." }, { status: 502 });
  }

  await supabase.from("signup_email_codes").update({ used_at: new Date().toISOString() }).eq("id", challengeId);
  return NextResponse.json({ ok: true });
}
