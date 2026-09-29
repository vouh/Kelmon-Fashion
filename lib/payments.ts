import "server-only";

import { configuredSiteOrigin, paymentFailedEmail, paymentReceivedEmail } from "@/lib/email/templates";
import { mpesaFailureReason } from "@/lib/mpesa";
import { awardLoyaltyPoints } from "@/lib/supabase/orders";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailSafely, sendPaymentReceivedAlert } from "@/lib/email/alerts";

/**
 * The single place an M-Pesa outcome is applied to an order, shared by the
 * Safaricom callback and the STK status query fallback.
 *
 * Both writes are conditional on the order still being in the state that
 * attempt left it in, so whichever of callback and query lands first wins and
 * the second is a no-op — the customer gets one email, not two. Every prompt
 * is logged in mpesa_requests, so a payment on any of an order's prompts is
 * found, and a second payment for a paid order is flagged for refund.
 *
 * Stock comes off in Postgres (the orders_deduct_stock trigger) the moment
 * payment_status becomes 'paid', not here.
 */

const siteUrl = configuredSiteOrigin;

async function customerEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await createServiceClient()
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return data?.email ?? null;
}

/**
 * Which order a prompt belongs to. The mpesa_requests log knows every prompt
 * ever sent; the order row only knows the latest, which covers prompts sent
 * before the log existed.
 */
async function findPrompt(
  supabase: ReturnType<typeof createServiceClient>,
  checkoutRequestId: string
): Promise<{ orderId: string; status: string | null } | null> {
  const { data: request } = await supabase
    .from("mpesa_requests")
    .select("order_id, status")
    .eq("checkout_request_id", checkoutRequestId)
    .maybeSingle();
  if (request) return { orderId: request.order_id, status: request.status };

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("mpesa_checkout_request_id", checkoutRequestId)
    .maybeSingle();
  return order ? { orderId: order.id, status: null } : null;
}

/**
 * Applies a successful payment. Safe to call any number of times for the same
 * prompt (Safaricom retries callbacks, and the status query may get there
 * first): the order is marked paid once, points and stock move once, and the
 * customer gets one email.
 *
 * If the money arrives on a prompt for an order that another prompt already
 * paid, the customer has paid twice. That payment is never dropped: it's
 * recorded, flagged `duplicate`, and raised to the admins to refund.
 */
export async function applyPaymentSuccess(
  checkoutRequestId: string,
  details: { receipt: string | null; phone: string | null; resultDesc: string }
): Promise<string | null> {
  const supabase = createServiceClient();

  const prompt = await findPrompt(supabase, checkoutRequestId);
  if (!prompt) {
    console.error("[payments] payment for an unknown prompt:", checkoutRequestId, details.receipt);
    return null;
  }

  if (prompt.status === "paid") {
    // Already handled for this prompt, typically by the status query, which
    // carries no receipt. Fill the receipt in from the late callback.
    if (details.receipt) {
      await supabase
        .from("mpesa_requests")
        .update({ receipt: details.receipt })
        .eq("checkout_request_id", checkoutRequestId)
        .is("receipt", null);
      await supabase
        .from("orders")
        .update({ mpesa_receipt_number: details.receipt })
        .eq("id", prompt.orderId)
        .eq("mpesa_checkout_request_id", checkoutRequestId)
        .is("mpesa_receipt_number", null);
    }
    return null;
  }

  // Claim this prompt's success exactly once, even if callback and query race.
  if (prompt.status !== null) {
    const { data: marked, error: markError } = await supabase
      .from("mpesa_requests")
      .update({
        status: "paid",
        result_code: 0,
        result_desc: details.resultDesc,
        receipt: details.receipt,
        ...(details.phone ? { phone: details.phone } : {}),
      })
      .eq("checkout_request_id", checkoutRequestId)
      .neq("status", "paid")
      .select("checkout_request_id")
      .maybeSingle();
    if (markError) console.error("[payments] could not mark prompt paid:", markError.message);
    else if (!marked) return null; // another handler just recorded it
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      payment_status: "paid",
      mpesa_checkout_request_id: checkoutRequestId,
      mpesa_receipt_number: details.receipt,
      mpesa_result_desc: details.resultDesc,
      mpesa_result_code: 0,
      mpesa_requested_at: null,
      ...(details.phone ? { mpesa_phone: details.phone } : {}),
    })
    .eq("id", prompt.orderId)
    // Money received is the truth even after a (wrong) failed status, so only
    // an already-paid order is skipped.
    .neq("payment_status", "paid")
    .select("id, user_id, total")
    .maybeSingle();

  if (error) {
    console.error("[payments] success update:", error.message);
    return null;
  }

  if (!order) {
    // The order was already paid through a different prompt: this is a second
    // payment for the same order. Keep it and get a human to refund it.
    await flagDoublePayment(supabase, prompt.orderId, checkoutRequestId, details.receipt);
    return null;
  }

  // Idempotent inside Postgres, so a duplicate callback cannot double-award.
  await awardLoyaltyPoints(order.id);

  // The customer gets their receipt; the shop's alert list and super admins
  // get a "payment received" email. Both best effort.
  await Promise.all([
    sendEmailSafely(
      await customerEmail(order.user_id),
      paymentReceivedEmail({ id: order.id, total: Number(order.total), receipt: details.receipt }, siteUrl()),
      "payments"
    ),
    sendPaymentReceivedAlert(order.id, details.receipt),
  ]);

  return order.id;
}

async function flagDoublePayment(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  checkoutRequestId: string,
  receipt: string | null
) {
  const { data: request } = await supabase
    .from("mpesa_requests")
    .update({ duplicate: true })
    .eq("checkout_request_id", checkoutRequestId)
    .select("amount, phone")
    .maybeSingle();

  const amount = request ? " of KES " + Number(request.amount).toLocaleString("en-KE") : "";
  const who = request?.phone ? " (" + request.phone + ")" : "";
  const receiptText = receipt ? ", M-Pesa receipt " + receipt : "";
  console.error(
    "[payments] DOUBLE PAYMENT on " + orderId + ": prompt " + checkoutRequestId +
      " (receipt " + (receipt ?? "unknown") + ") - refund needed"
  );

  const { error } = await supabase.from("admin_notifications").insert({
    type: "payment_failed",
    title: "Double payment on " + orderId + " — refund needed",
    body:
      "The customer" + who + " paid a second time" + amount + receiptText +
      ". The order was already paid, so refund this payment.",
    link: "/admin/transactions",
  });
  if (error) console.error("[payments] could not raise double-payment alert:", error.message);
}

export async function applyPaymentFailure(
  checkoutRequestId: string,
  details: { resultCode: number; resultDesc: string }
): Promise<{ orderId: string; reason: string } | null> {
  const supabase = createServiceClient();
  const reason = mpesaFailureReason(details.resultCode, details.resultDesc);

  // Record the outcome on the prompt. A failure never overrides a success.
  await supabase
    .from("mpesa_requests")
    .update({
      status: "failed",
      result_code: details.resultCode,
      result_desc: details.resultDesc,
    })
    .eq("checkout_request_id", checkoutRequestId)
    .eq("status", "pending");

  // Only the order's *current* prompt can mark it failed: an old prompt timing
  // out after a newer one was sent must not undo the newer one.
  // Leave the order pending so the customer can retry with a fresh STK push.
  const { data: order, error } = await supabase
    .from("orders")
    .update({
      status: "pending",
      payment_status: "failed",
      mpesa_result_desc: details.resultDesc,
      mpesa_result_code: details.resultCode,
      mpesa_requested_at: null,
    })
    .eq("mpesa_checkout_request_id", checkoutRequestId)
    .eq("payment_status", "initiated")
    .select("id, user_id, total, mpesa_phone, phone")
    .maybeSingle();

  if (error) {
    console.error("[payments] failure update:", error.message);
    return null;
  }
  if (!order) return null;

  const { error: logError } = await supabase.from("payment_failures").insert({
    order_id: order.id,
    checkout_request_id: checkoutRequestId,
    result_code: details.resultCode,
    result_desc: details.resultDesc,
    reason,
    phone: order.mpesa_phone ?? order.phone,
    amount: Number(order.total),
  });
  if (logError) console.error("[payments] failure log:", logError.message);

  // Failures go to the customer only; staff see them on the notifications
  // bell and the Payments page.
  await sendEmailSafely(
    await customerEmail(order.user_id),
    paymentFailedEmail({ id: order.id, total: Number(order.total), reason }, siteUrl()),
    "payments"
  );

  return { orderId: order.id, reason };
}
