import "server-only";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export function getEmailSettings() {
  const from = process.env.RESEND_FROM_EMAIL;
  const contactRecipients = (process.env.RESEND_CONTACT_TO_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return {
    from,
    contactRecipients,
    isConfigured: Boolean(resend && from && contactRecipients.length > 0),
  };
}
