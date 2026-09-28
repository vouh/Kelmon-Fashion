import { NextResponse } from "next/server";

import { getEmailSettings, resend } from "@/lib/email/resend";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 5_000;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });
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

  const safeName = escapeHtml(`${firstName} ${lastName}`);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Not provided");
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br />");

  const { error } = await resend.emails.send({
    from: settings.from,
    to: settings.contactRecipients,
    replyTo: email,
    subject: `New Kelmon contact message from ${firstName} ${lastName}`,
    text: `Name: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\n\nMessage:\n${message}`,
    html: `<main><h1>New Kelmon contact message</h1><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Phone:</strong> ${safePhone}</p><hr /><p>${safeMessage}</p></main>`,
  });

  if (error) {
    console.error("Resend contact email failed", error);
    return NextResponse.json({ error: "We could not send your message. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
