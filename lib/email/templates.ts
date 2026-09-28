import "server-only";

import logo from "@/lib/logo";

const brand = {
  purple: "#8e44ad",
  purpleDeep: "#7030a0",
  gold: "#c5a059",
  bg: "#faf6fc",
  surface: "#ffffff",
  lilac: "#efe4f7",
  text: "#2a1a36",
  muted: "#5c4a6a",
  faint: "#8a7a96",
  border: "rgba(142, 68, 173, 0.18)",
};

const serif = "'Playfair Display', Georgia, 'Times New Roman', serif";
const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
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

/**
 * Never derived from the request's Host header in production: an attacker could
 * forge it and have a link meant for someone else point at their own site.
 */
export function siteOrigin(request: Request): string | null {
  if (process.env.NODE_ENV !== "production") return new URL(request.url).origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || null;
}

interface LayoutOptions {
  origin: string | null;
  /** Inbox preview line; hidden in the body. */
  preheader: string;
  eyebrow: string;
  heading: string;
  /** Trusted HTML. Escape any user input before passing it in. */
  bodyHtml: string;
  cta?: { label: string; url: string };
  /** Trusted HTML shown under the button in smaller type. */
  footnoteHtml?: string;
}

export function emailLayout({ origin, preheader, eyebrow, heading, bodyHtml, cta, footnoteHtml }: LayoutOptions): string {
  const logoUrl = origin ? `${origin}${logo.src}` : null;
  const siteLink = origin ?? "https://kelmon.co.ke";

  const logoCell = logoUrl
    ? `<img src="${logoUrl}" width="56" height="56" alt="Kelmon" style="display:block;width:56px;height:56px;border:0;border-radius:16px;background:${brand.surface};" />`
    : `<div style="font-family:${serif};font-size:26px;font-weight:700;color:${brand.surface};">K</div>`;

  const ctaBlock = cta
    ? `<tr><td style="padding:30px 40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:16px;background:${brand.purple};box-shadow:0 10px 24px rgba(142,68,173,0.28);">
            <a href="${cta.url}" style="display:inline-block;padding:15px 30px;font-family:${sans};font-size:15px;font-weight:700;letter-spacing:0.3px;color:#ffffff;text-decoration:none;border-radius:16px;">${escapeHtml(cta.label)} &rarr;</a>
          </td>
        </tr></table>
      </td></tr>`
    : "";

  const footnoteBlock = footnoteHtml
    ? `<tr><td style="padding:26px 40px 0;font-family:${sans};font-size:13px;line-height:1.65;color:${brand.faint};">${footnoteHtml}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${brand.bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.bg};padding:36px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <tr><td style="background:${brand.purple};background-image:linear-gradient(135deg, ${brand.purple} 0%, ${brand.purpleDeep} 100%);border-radius:28px 28px 0 0;padding:28px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;">${logoCell}</td>
              <td style="vertical-align:middle;padding-left:14px;">
                <div style="font-family:${serif};font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Kelmon</div>
                <div style="font-family:${sans};font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${brand.gold};padding-top:2px;">Fashion &middot; Beauty &middot; Salon</div>
              </td>
            </tr></table>
          </td></tr>

          <tr><td style="background:${brand.gold};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

          <tr><td style="background:${brand.surface};border:1px solid ${brand.border};border-top:0;border-radius:0 0 28px 28px;padding:0 0 38px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:36px 40px 0;">
                <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${brand.lilac};font-family:${sans};font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${brand.purple};">${escapeHtml(eyebrow)}</span>
              </td></tr>
              <tr><td style="padding:16px 40px 0;font-family:${serif};font-size:30px;line-height:1.2;font-weight:700;color:${brand.text};">${escapeHtml(heading)}</td></tr>
              <tr><td style="padding:14px 40px 0;font-family:${sans};font-size:15px;line-height:1.7;color:${brand.muted};">${bodyHtml}</td></tr>
              ${ctaBlock}
              ${footnoteBlock}
            </table>
          </td></tr>

          <tr><td align="center" style="padding:26px 20px 0;font-family:${sans};font-size:12px;line-height:1.7;color:${brand.faint};">
            <a href="${siteLink}" style="font-family:${serif};font-size:15px;font-weight:700;color:${brand.purple};text-decoration:none;">Kelmon</a><br />
            Campus fashion &amp; beauty, delivered in Kenya.<br />
            <a href="${siteLink}/shop" style="color:${brand.faint};">Shop</a> &nbsp;&middot;&nbsp;
            <a href="${siteLink}/salon" style="color:${brand.faint};">Salon</a> &nbsp;&middot;&nbsp;
            <a href="${siteLink}/contact" style="color:${brand.faint};">Contact</a>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function passwordResetEmail(link: string, origin: string | null) {
  return {
    subject: "Reset your Kelmon password",
    text:
      "We got a request to reset the password for your Kelmon account.\n\n" +
      `Choose a new password here:\n${link}\n\n` +
      "This link expires in 1 hour and can only be used once. If you didn't ask for a reset, ignore this email and your password will stay the same.",
    html: emailLayout({
      origin,
      preheader: "Choose a new password for your Kelmon account. The link expires in 1 hour.",
      eyebrow: "Account security",
      heading: "Reset your password",
      bodyHtml:
        "We got a request to reset the password for your Kelmon account. Tap the button below to choose a new one — you'll be signed straight back in.",
      cta: { label: "Choose a new password", url: link },
      footnoteHtml:
        "This link expires in <strong>1 hour</strong> and can only be used once. If you didn't ask for a reset, you can safely ignore this email and your password will stay the same." +
        `<br /><br /><span style="font-size:12px;word-break:break-all;">Button not working? Paste this into your browser:<br /><a href="${link}" style="color:${brand.purple};">${link}</a></span>`,
    }),
  };
}

export function contactMessageEmail(
  message: { firstName: string; lastName: string; email: string; phone: string; message: string },
  origin: string | null,
) {
  const name = `${message.firstName} ${message.lastName}`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;width:78px;vertical-align:top;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${brand.faint};">${label}</td>` +
    `<td style="padding:8px 0;vertical-align:top;font-size:15px;color:${brand.text};">${value}</td></tr>`;

  const safeEmail = escapeHtml(message.email);

  return {
    subject: `New Kelmon contact message from ${name}`,
    text: `Name: ${name}\nEmail: ${message.email}\nPhone: ${message.phone || "Not provided"}\n\nMessage:\n${message.message}`,
    html: emailLayout({
      origin,
      preheader: `${name} sent a message through the Kelmon contact form.`,
      eyebrow: "Contact form",
      heading: "New message",
      bodyHtml:
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${brand.border};margin-bottom:18px;">` +
        row("Name", escapeHtml(name)) +
        row("Email", `<a href="mailto:${safeEmail}" style="color:${brand.purple};">${safeEmail}</a>`) +
        row("Phone", escapeHtml(message.phone || "Not provided")) +
        `</table>` +
        `<div style="padding:18px 20px;border-radius:18px;background:${brand.bg};border-left:4px solid ${brand.gold};color:${brand.text};">${escapeHtml(message.message).replace(/\r?\n/g, "<br />")}</div>`,
      footnoteHtml: "Reply to this email to answer them directly.",
    }),
  };
}
