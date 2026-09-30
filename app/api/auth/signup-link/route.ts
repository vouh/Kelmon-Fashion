import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The one-click link in the sign-up email.
 *
 * POST (from /verify-email) checks the code carried in the link and stamps the
 * challenge verified. It can't create the account itself — the password only
 * exists in the sign-up window — so that window polls GET for the stamp and
 * then finishes through /api/auth/signup-verify.
 */

const MAX_ATTEMPTS = 5;
const UUID = /^[0-9a-f-]{36}$/i;
const hashCode = (id: string, code: string) =>
  createHash("sha256").update(`${id}:${code}`).digest("hex");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown; code?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!UUID.test(id) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "This verification link is incomplete. Use the code in the email instead." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: challenge, error } = await supabase
    .from("signup_email_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !challenge) {
    return NextResponse.json({ error: "This verification link is invalid. Request a new code." }, { status: 400 });
  }
  if (challenge.used_at) {
    return NextResponse.json({ ok: true, email: challenge.email, alreadyCreated: true });
  }
  if (challenge.verified_at) {
    return NextResponse.json({ ok: true, email: challenge.email });
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "This verification link has expired. Request a new code." }, { status: 400 });
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
  }

  const actual = Buffer.from(hashCode(id, code), "hex");
  const expected = Buffer.from(challenge.code_hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    await supabase.from("signup_email_codes").update({ attempts: challenge.attempts + 1 }).eq("id", id);
    return NextResponse.json({ error: "This verification link is invalid. Request a new code." }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("signup_email_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) {
    console.error("Marking sign-up link verified failed", updateError);
    return NextResponse.json({ error: "We could not verify your email. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, email: challenge.email });
}

/** Polled by the sign-up window: has this challenge's link been clicked? */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ verified: false }, { status: 400 });

  const { data } = await createServiceClient()
    .from("signup_email_codes")
    .select("verified_at, used_at, expires_at")
    .eq("id", id)
    .maybeSingle();
  return NextResponse.json(
    {
      verified: Boolean(data?.verified_at) && !data?.used_at,
      expired: !data || new Date(data.expires_at).getTime() <= Date.now(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
