import "server-only";

import { PRODUCTION_SITE_URL } from "@/lib/seo";

const PUBLIC_SITE = PRODUCTION_SITE_URL;

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
 * Local dev links back to the dev server; production always links to the live
 * store. Never derived from the request's Host header in production: an attacker
 * could forge it and have a link meant for someone else point at their own site.
 */
export function siteOrigin(request: Request): string {
  if (process.env.NODE_ENV !== "production") return new URL(request.url).origin;
  return PRODUCTION_SITE_URL;
}

/** siteOrigin for emails sent outside a request (payment callbacks, announcements). */
export function configuredSiteOrigin(): string | null {
  if (process.env.NODE_ENV === "production") return PRODUCTION_SITE_URL;
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
  /**
   * Where the header logo comes from. Defaults to the inline attachment that
   * lib/email/resend.ts adds to every single send; batch sends (which can't
   * carry attachments) pass the hosted copy instead.
   */
  logoSrc?: string;
}

/** The hosted white logo, for emails that can't carry an inline attachment. */
export const HOSTED_EMAIL_LOGO = `${PUBLIC_SITE}/email/kelmon-logo-light.png`;

export function emailLayout({
  origin,
  preheader,
  eyebrow,
  heading,
  bodyHtml,
  cta,
  footnoteHtml,
  logoSrc = "cid:kelmon-logo",
}: LayoutOptions): string {
  const siteLink = origin ?? PUBLIC_SITE;

  // The full white logo on the purple header. By default it's attached inline
  // (cid:), so it shows even in inboxes that block images from websites; the
  // alt text keeps the brand name if it still can't load.
  const logoCell = `<img src="${logoSrc}" width="210" alt="Kelmon — Beauty · Fashion · Glamour" style="display:block;width:210px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;font-family:${serif};font-size:26px;font-weight:700;color:#ffffff;" />`;

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
            <a href="${siteLink}" style="text-decoration:none;">${logoCell}</a>
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
            <span style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${brand.gold};">Beauty &middot; Fashion &middot; Glamour</span><br />
            Delivered to your campus in Kenya.<br />
            <a href="${siteLink}/shop" style="color:${brand.faint};">Shop</a> &nbsp;&middot;&nbsp;
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

export function accountInviteEmail({
  link,
  origin,
  name,
  admin,
}: {
  link: string;
  origin: string | null;
  name: string | null;
  /** Invited as an admin (true) or a shopper (false); only changes the wording. */
  admin: boolean;
}) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  const what = admin
    ? "You've been added to the <strong>Kelmon team</strong> as an admin. Once your password is set you'll be able to manage orders, products and payments from the admin dashboard."
    : "A <strong>Kelmon</strong> account has been created for you. Once your password is set you can shop, track your orders and collect loyalty points.";
  const rules = "Your password needs at least 8 characters, including a number, an uppercase letter and a special character.";

  return {
    subject: admin ? "You're invited to the Kelmon admin team" : "Your Kelmon account is ready",
    text:
      `${name ? `Hi ${name},` : "Hi there,"}\n\n` +
      (admin
        ? "You've been added to the Kelmon team as an admin.\n\n"
        : "A Kelmon account has been created for you.\n\n") +
      `Set your password here:\n${link}\n\n${rules}\n\n` +
      "This link expires in 1 hour and can only be used once. If it has expired, ask the Kelmon team to send a new invite. If you weren't expecting this, you can ignore this email.",
    html: emailLayout({
      origin,
      preheader: admin
        ? "Set your password to join the Kelmon admin team."
        : "Set your password to start shopping on Kelmon.",
      eyebrow: admin ? "Team invite" : "Welcome",
      heading: "Set up your Kelmon account",
      bodyHtml: `${greeting}<br /><br />${what}<br /><br />${rules}`,
      cta: { label: "Set my password", url: link },
      footnoteHtml:
        "This link expires in <strong>1 hour</strong> and can only be used once. If it has expired, ask the Kelmon team to send you a new invite. If you weren't expecting this, you can safely ignore this email." +
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

function formatKesPlain(amount: number): string {
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

/** The paid order, for the receipt and the staff "payment received" email. */
export interface PaidOrderDetails {
  id: string;
  customerName: string;
  phone: string;
  dropPoint: string;
  paymentMethod: string;
  receipt: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  lines: { name: string; quantity: number; price: number; variant?: string | null }[];
}

/**
 * The customer's email when their payment succeeds: a full receipt — what
 * they bought, what they paid, and where it's being delivered.
 */
export function paymentReceivedEmail(order: PaidOrderDetails, origin: string | null) {
  const ordersUrl = `${origin ?? PUBLIC_SITE}/orders`;
  const itemsText = order.lines
    .map((l) => `- ${l.name}${l.variant ? ` (${l.variant})` : ""} x${l.quantity}  ${formatKesPlain(l.price * l.quantity)}`)
    .join("\n");
  const money = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:5px 0;font-size:14px;color:${bold ? brand.text : brand.muted};${bold ? "font-weight:700;" : ""}">${label}</td>` +
    `<td align="right" style="padding:5px 0;font-size:14px;color:${brand.text};${bold ? "font-weight:700;font-size:16px;" : ""}">${escapeHtml(value)}</td></tr>`;

  return {
    subject: `Order confirmed — ${order.id} (${formatKesPlain(order.total)} paid)`,
    text:
      `Thank you! We received your payment of ${formatKesPlain(order.total)} for order ${order.id}.` +
      `${order.receipt ? ` M-Pesa receipt: ${order.receipt}.` : ""}\n\n` +
      `${itemsText}\n\nSubtotal: ${formatKesPlain(order.subtotal)}\n` +
      `Delivery: ${order.deliveryFee ? formatKesPlain(order.deliveryFee) : "Free"}\nTotal paid: ${formatKesPlain(order.total)}\n\n` +
      `Delivering to: ${order.dropPoint}\n\nTrack your order: ${ordersUrl}`,
    html: emailLayout({
      origin,
      preheader: `Payment of ${formatKesPlain(order.total)} received — order ${order.id} is confirmed.`,
      eyebrow: "Order confirmed",
      heading: "Thank you — you're paid up",
      bodyHtml:
        `We received your payment for order <strong>${escapeHtml(order.id)}</strong> and we're getting it ready now.` +
        itemsTable(order.lines) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">` +
        money("Subtotal", formatKesPlain(order.subtotal)) +
        money("Delivery", order.deliveryFee ? formatKesPlain(order.deliveryFee) : "Free") +
        money("Total paid", formatKesPlain(order.total), true) +
        `</table>` +
        detailRows([
          ["Delivering to", order.dropPoint],
          ["Phone", order.phone],
          ...(order.receipt ? ([["M-Pesa receipt", order.receipt]] as [string, string][]) : []),
        ]),
      cta: { label: "Track your order", url: ordersUrl },
    }),
  };
}

export function paymentFailedEmail(
  order: { id: string; total: number; reason: string },
  origin: string | null,
) {
  const ordersUrl = `${origin ?? PUBLIC_SITE}/orders`;
  return {
    subject: `Payment not completed — order ${order.id}`,
    text:
      `Your M-Pesa payment of ${formatKesPlain(order.total)} for order ${order.id} did not go through.\n\n` +
      `Reason: ${order.reason}\n\nNo money was taken. You can try again from your orders page: ${ordersUrl}`,
    html: emailLayout({
      origin,
      preheader: `Your payment for order ${order.id} did not go through: ${order.reason}`,
      eyebrow: "Payment failed",
      heading: "Your payment didn't go through",
      bodyHtml:
        `Your M-Pesa payment of <strong>${escapeHtml(formatKesPlain(order.total))}</strong> for order <strong>${escapeHtml(order.id)}</strong> was not completed.` +
        `<div style="margin-top:16px;padding:14px 18px;border-radius:14px;background:${brand.bg};border-left:4px solid ${brand.gold};color:${brand.text};"><strong>Reason:</strong> ${escapeHtml(order.reason)}</div>`,
      cta: { label: "Try again", url: ordersUrl },
      footnoteHtml: "No money was taken from your M-Pesa account for this attempt.",
    }),
  };
}

/** A message written by an admin in /admin/communications. Body is plain text. */
export function announcementEmail(
  message: { subject: string; body: string },
  origin: string | null,
) {
  const paragraphs = message.body
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\r?\n/g, "<br />")}</p>`)
    .join("");

  return {
    subject: message.subject,
    text: message.body,
    html: emailLayout({
      origin,
      // Sent in batches, which can't carry the inline logo attachment.
      logoSrc: HOSTED_EMAIL_LOGO,
      preheader: message.body.slice(0, 120),
      eyebrow: "From Kelmon",
      heading: message.subject,
      bodyHtml: paragraphs,
      cta: { label: "Visit the shop", url: `${origin ?? PUBLIC_SITE}/shop` },
    }),
  };
}

// ── Admin alerts (sent to the Settings alert list + super admins) ───────────

export interface AlertOrder {
  id: string;
  customerName: string;
  phone: string;
  dropPoint: string;
  paymentMethod: string;
  total: number;
  lines: { name: string; quantity: number; price: number; variant?: string | null }[];
  source?: string;
}

function detailRows(rows: [string, string][]) {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">` +
    rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 0;width:110px;vertical-align:top;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${brand.faint};">${escapeHtml(label)}</td>` +
          `<td style="padding:6px 0;vertical-align:top;font-size:15px;color:${brand.text};">${escapeHtml(value)}</td></tr>`
      )
      .join("") +
    `</table>`
  );
}

function itemsTable(lines: AlertOrder["lines"]) {
  if (!lines.length) return "";
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid ${brand.border};">` +
    lines
      .map(
        (l) =>
          `<tr><td style="padding:9px 0;border-bottom:1px solid ${brand.border};font-size:14px;color:${brand.text};">${escapeHtml(l.name)}${
            l.variant ? ` <span style="color:${brand.faint};">(${escapeHtml(l.variant)})</span>` : ""
          } &times; ${l.quantity}</td>` +
          `<td align="right" style="padding:9px 0;border-bottom:1px solid ${brand.border};font-size:14px;color:${brand.text};white-space:nowrap;">${escapeHtml(formatKesPlain(l.price * l.quantity))}</td></tr>`
      )
      .join("") +
    `</table>`
  );
}

function paymentLabel(method: string) {
  return method === "cod" ? "Pay on delivery" : "M-Pesa";
}

export function newOrderAdminEmail(order: AlertOrder, origin: string | null) {
  const adminUrl = `${origin ?? PUBLIC_SITE}/admin/orders`;
  const itemCount = order.lines.reduce((n, l) => n + l.quantity, 0);
  const itemsText = order.lines.map((l) => `- ${l.name}${l.variant ? ` (${l.variant})` : ""} x${l.quantity}`).join("\n");
  return {
    subject: `New order ${order.id} — ${formatKesPlain(order.total)} from ${order.customerName}`,
    text:
      `New order ${order.id}\n\nCustomer: ${order.customerName}\nPhone: ${order.phone}\nDrop point: ${order.dropPoint}\n` +
      `Payment: ${paymentLabel(order.paymentMethod)}\nTotal: ${formatKesPlain(order.total)}\n\n${itemsText}\n\n${adminUrl}`,
    html: emailLayout({
      origin,
      preheader: `${order.customerName} ordered ${itemCount} item${itemCount === 1 ? "" : "s"} — ${formatKesPlain(order.total)}.`,
      eyebrow: order.source === "admin_direct" ? "New order (created by admin)" : "New order",
      heading: `Order ${order.id}`,
      bodyHtml:
        detailRows([
          ["Customer", order.customerName],
          ["Phone", order.phone],
          ["Drop point", order.dropPoint],
          ["Payment", `${paymentLabel(order.paymentMethod)} · not paid yet`],
          ["Total", formatKesPlain(order.total)],
        ]) + itemsTable(order.lines),
      cta: { label: "Open orders", url: adminUrl },
      footnoteHtml: "You'll get another email when it's paid.",
    }),
  };
}

export function paymentReceivedAdminEmail(
  payment: {
    id: string;
    customerName: string;
    phone: string;
    total: number;
    receipt: string | null;
    method: string;
    dropPoint?: string;
    lines?: AlertOrder["lines"];
  },
  origin: string | null,
) {
  const adminUrl = `${origin ?? PUBLIC_SITE}/admin/transactions`;
  return {
    subject: `Paid: ${payment.id} — ${formatKesPlain(payment.total)}${payment.receipt ? ` (${payment.receipt})` : ""}`,
    text:
      `Payment received for order ${payment.id}.\n\nCustomer: ${payment.customerName}\nPhone: ${payment.phone}\n` +
      `Amount: ${formatKesPlain(payment.total)}\nMethod: ${paymentLabel(payment.method)}\n` +
      `${payment.receipt ? `M-Pesa receipt: ${payment.receipt}\n` : ""}\nThe order is confirmed and ready to pack.\n${adminUrl}`,
    html: emailLayout({
      origin,
      preheader: `${payment.customerName} paid ${formatKesPlain(payment.total)} for ${payment.id}.`,
      eyebrow: "Payment received",
      heading: `${formatKesPlain(payment.total)} received`,
      bodyHtml:
        detailRows([
          ["Order", payment.id],
          ["Customer", payment.customerName],
          ["Phone", payment.phone],
          ["Method", paymentLabel(payment.method)],
          ...(payment.receipt ? ([["M-Pesa receipt", payment.receipt]] as [string, string][]) : []),
          ...(payment.dropPoint ? ([["Deliver to", payment.dropPoint]] as [string, string][]) : []),
        ]) +
        itemsTable(payment.lines ?? []) +
        `<p style="margin:14px 0 0;">The order is confirmed and ready to pack.</p>`,
      cta: { label: "View payments", url: adminUrl },
    }),
  };
}

/** The one-time code a super admin needs to approve deleting sensitive records. */
export function sensitiveActionCodeEmail(
  request: { code: string; summary: string; requester: string; minutes: number },
  origin: string | null,
) {
  return {
    subject: `Kelmon approval code: ${request.code}`,
    text:
      `${request.requester} asked to delete: ${request.summary}\n\n` +
      `Approval code: ${request.code}\n\nIt works once and expires in ${request.minutes} minutes. ` +
      `If you don't recognise this request, don't share the code — nothing is deleted without it.`,
    html: emailLayout({
      origin,
      preheader: `Approval code ${request.code} — ${request.requester} wants to delete ${request.summary}.`,
      eyebrow: "Approval needed",
      heading: "Approve a deletion",
      bodyHtml:
        `<strong>${escapeHtml(request.requester)}</strong> asked to permanently delete <strong>${escapeHtml(request.summary)}</strong>.` +
        `<div style="margin:22px 0 6px;text-align:center;">` +
        `<span style="display:inline-block;padding:14px 26px;border-radius:16px;background:${brand.lilac};font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${brand.purpleDeep};">${escapeHtml(request.code)}</span>` +
        `</div>` +
        `<p style="margin:8px 0 0;text-align:center;font-size:13px;color:${brand.faint};">Works once · expires in ${request.minutes} minutes</p>`,
      footnoteHtml:
        "Only share this code if you approve the deletion. If you don't recognise the request, ignore this email — nothing is deleted without the code.",
    }),
  };
}
