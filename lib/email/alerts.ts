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

/** Every super admin's email: the owner plus anyone made super admin in Accounts. */
async function getSuperAdminEmails(): Promise<string[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [...PROTECTED_SUPER_ADMIN_EMAILS];
  const { data, error } = await createServiceClient()
    .from("profiles")
    .select("email")
    .eq("super_admin", true)
    .not("email", "is", null);
  if (error) console.error("[alerts] could not read super admins:", error.message);
  return [...PROTECTED_SUPER_ADMIN_EMAILS, ...(data ?? []).map((r) => r.email as string)];
}

/**
 * Everyone who gets order and payment alerts: the Settings list plus all super
 * admins. Deduplicated case-insensitively, so an address on both gets one email.
 */
export async function getAlertRecipients(): Promise<string[]> {
  const [saved, superAdmins] = await Promise.all([getSavedAlertRecipients(), getSuperAdminEmails()]);
  const all = [...saved, ...superAdmins].map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"));
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

/**
 * A successful payment, by any route (M-Pesa callback, status check, or an
 * admin marking it paid): the customer gets a full receipt with the order, and
 * the alert list plus super admins get "payment received" with the order.
 * Failed payments never come here — they go to the customer only.
 */
export async function sendPaymentSuccessEmails(orderId: string, receipt: string | null) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, user_id, customer_name, phone, mpesa_phone, drop_point, payment_method, subtotal, delivery_fee, total, mpesa_receipt_number, order_items(name, quantity, price, variant)"
    )
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

  const details = {
    id: order.id,
    customerName: order.customer_name,
    phone: order.mpesa_phone ?? order.phone,
    dropPoint: order.drop_point,
    paymentMethod: order.payment_method,
    receipt: receipt ?? order.mpesa_receipt_number,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    lines: (order.order_items ?? []).map((l) => ({
      name: l.name,
      quantity: l.quantity,
      price: Number(l.price),
      variant: l.variant,
    })),
  };
  const origin = configuredSiteOrigin();

  await Promise.all([
    sendEmailSafely(customer, paymentReceivedEmail(details, origin), "payments"),
    sendToAdmins(
      paymentReceivedAdminEmail(
        {
          id: details.id,
          customerName: details.customerName,
          phone: details.phone,
          total: details.total,
          receipt: details.receipt,
          method: details.paymentMethod,
          dropPoint: details.dropPoint,
          lines: details.lines,
        },
        origin
      ),
      "payment-alert"
    ),
  ]);
}

/** An admin marked an order paid by hand (e.g. cash on delivery). */
export async function sendManualPaymentEmails(orderId: string) {
  await sendPaymentSuccessEmails(orderId, null);
}
