import { NextResponse } from "next/server";

import { getEmailSettings, resend } from "@/lib/email/resend";
import { contactMessageEmail, siteOrigin } from "@/lib/email/templates";
import { getContactRecipients } from "@/lib/supabase/admin-inbox";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 5_000;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const settings = getEmailSettings();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const firstName = asTrimmedString(values.firstName);
  const lastName = asTrimmedString(values.lastName);
  const email = asTrimmedString(values.email).toLowerCase();
  const phone = asTrimmedString(values.phone);
  const message = asTrimmedString(values.message);

  if (!firstName || !lastName || !message || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Please complete the required fields with a valid email address." }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Your message is too long." }, { status: 400 });
  }

  // Saved first, so the message reaches the admin inbox (and raises a
  // notification) even if the email below fails.
  let saved = false;
  try {
    const { error: saveError } = await createServiceClient()
      .from("contact_messages")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        message,
      });
    if (saveError) console.error("Saving contact message failed", saveError.message);
    else saved = true;
  } catch (err) {
    console.error("Saving contact message failed", err);
  }

  // Recipients come from admin Settings, falling back to RESEND_CONTACT_TO_EMAIL.
  const recipients = await getContactRecipients();

  if (!resend || !settings.from || recipients.length === 0) {
    if (saved) return NextResponse.json({ ok: true });
    return NextResponse.json(
      { error: "Email is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  const { error } = await resend.emails.send({
    from: settings.from,
    to: recipients,
    replyTo: email,
    ...contactMessageEmail({ firstName, lastName, email, phone, message }, siteOrigin(request)),
  });

  if (error) {
    console.error("Resend contact email failed", error);
    if (saved) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "We could not send your message. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
