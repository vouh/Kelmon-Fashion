import "server-only";

import { Resend } from "resend";
import { EMAIL_LOGO_BASE64 } from "@/lib/email/logo-data";

const resendApiKey = process.env.RESEND_API_KEY;
const client = resendApiKey ? new Resend(resendApiKey) : null;

/** Referenced as `cid:kelmon-logo` in the email layout's header. */
export const EMAIL_LOGO_CID = "kelmon-logo";

type SendParams = Parameters<Resend["emails"]["send"]>[0];

/**
 * Attaches the logo inline whenever the HTML uses it, so every email shows the
 * real Kelmon logo — including in inboxes that block remote images.
 */
function withLogo(params: SendParams): SendParams {
  const html = "html" in params && typeof params.html === "string" ? params.html : "";
  if (!html.includes(`cid:${EMAIL_LOGO_CID}`)) return params;
  return {
    ...params,
    attachments: [
      ...(params.attachments ?? []),
      {
        filename: "kelmon-logo.png",
        content: EMAIL_LOGO_BASE64,
        contentType: "image/png",
        contentId: EMAIL_LOGO_CID,
      },
    ],
  } as SendParams;
}

/**
 * The Resend client, with single sends wrapped to carry the inline logo.
 * Batch sends can't carry attachments (a Resend limit), so batch emails use
 * the hosted logo URL instead — see announcementEmail().
 */
export const resend = client
  ? {
      emails: {
        send: (params: SendParams, options?: Parameters<Resend["emails"]["send"]>[1]) =>
          client.emails.send(withLogo(params), options),
      },
      batch: client.batch,
    }
  : null;

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
    canSendToCustomers: Boolean(resend && from),
  };
}
