import { NextResponse } from "next/server";

import { getEmailSettings, resend } from "@/lib/email/resend";
import { contactMessageEmail, siteOrigin } from "@/lib/email/templates";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 5_000;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const settings = getEmailSettings();

  if (!settings.isConfigured || !resend || !settings.from) {
    return NextResponse.json(
      { error: "Email is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

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

  const { error } = await resend.emails.send({
    from: settings.from,
    to: settings.contactRecipients,
    replyTo: email,
    ...contactMessageEmail({ firstName, lastName, email, phone, message }, siteOrigin(request)),
  });

  if (error) {
    console.error("Resend contact email failed", error);
    return NextResponse.json({ error: "We could not send your message. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
