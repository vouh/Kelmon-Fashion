import "server-only";

import { PROTECTED_SUPER_ADMIN_EMAILS } from "@/lib/auth/protected-accounts";
import { getEmailSettings, resend } from "@/lib/email/resend";
import {
  configuredSiteOrigin,
  newOrderAdminEmail,
  paymentReceivedAdminEmail,
  paymentReceivedEmail,
  type AlertOrder,
} from "@/lib/email/templates";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Order and payment emails to the shop's staff.
 *
 * Recipients are the "Order & payment alerts" list in admin Settings (up to
 * four addresses) plus the super admins, who always get them. Every send is
 * best effort: an email problem is logged and never fails an order or payment.
 */

export const ORDER_ALERT_RECIPIENTS_KEY = "order_alert_recipients";
export const MAX_ORDER_ALERT_RECIPIENTS = 4;

type EmailMessage = { subject: string; text: string; html: string };

function asEmailList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.includes("@"))
    : [];
}

/** The saved alert list (without super admins). Service role: callers include callbacks. */
export async function getSavedAlertRecipients(): Promise<string[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const { data, error } = await createServiceClient()
    .from("site_settings")
    .select("value")
    .eq("key", ORDER_ALERT_RECIPIENTS_KEY)
    .maybeSingle();
  if (error) console.error("[alerts] could not read recipients:", error.message);
  return asEmailList(data?.value);
}

/** Everyone who gets order and payment alerts, deduplicated. */
export async function getAlertRecipients(): Promise<string[]> {
  const saved = await getSavedAlertRecipients();
  const all = [...saved, ...PROTECTED_SUPER_ADMIN_EMAILS].map((e) => e.trim().toLowerCase());
  return [...new Set(all)];
}

/** Sends one message to one address. Never throws. */
export async function sendEmailSafely(to: string | null | undefined, message: EmailMessage, tag: string) {
  const settings = getEmailSettings();
  if (!to || !resend || !settings.from) return;
  try {
    const { error } = await resend.emails.send({ from: settings.from, to, ...message });
    if (error) console.error(`[${tag}] email to ${to} failed:`, error);
  } catch (err) {
    console.error(`[${tag}] email to ${to} failed:`, err);
  }
}

/** Sends to every alert recipient separately, so nobody sees the others' addresses. */
async function sendToAdmins(message: EmailMessage, tag: string) {
  const recipients = await getAlertRecipients();
  await Promise.all(recipients.map((to) => sendEmailSafely(to, message, tag)));
}

export async function sendNewOrderAlert(order: AlertOrder) {
  await sendToAdmins(newOrderAdminEmail(order, configuredSiteOrigin()), "order-alert");
}

/** Looks the order up by id, so any code path that marks an order paid can call it. */
export async function sendPaymentReceivedAlert(orderId: string, receipt: string | null) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { data: order } = await createServiceClient()
    .from("orders")
    .select("id, customer_name, phone, mpesa_phone, total, payment_method, mpesa_receipt_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  await sendToAdmins(
    paymentReceivedAdminEmail(
      {
        id: order.id,
        customerName: order.customer_name,
        phone: order.mpesa_phone ?? order.phone,
        total: Number(order.total),
        receipt: receipt ?? order.mpesa_receipt_number,
        method: order.payment_method,
      },
      configuredSiteOrigin()
    ),
    "payment-alert"
  );
}

/**
 * An admin marked an order paid by hand (cash on delivery, or M-Pesa paid
 * outside the prompt): the customer gets their receipt and staff get the
 * usual "payment received" alert.
 */
export async function sendManualPaymentEmails(orderId: string) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, total, mpesa_receipt_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  let customer: string | null = null;
  if (order.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();
    customer = profile?.email ?? null;
  }

  await Promise.all([
    sendEmailSafely(
      customer,
      paymentReceivedEmail(
        { id: order.id, total: Number(order.total), receipt: order.mpesa_receipt_number },
        configuredSiteOrigin()
      ),
      "payments"
    ),
    sendPaymentReceivedAlert(order.id, order.mpesa_receipt_number),
  ]);
}
