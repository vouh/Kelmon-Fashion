import { NextResponse } from "next/server";
import { isMpesaConfigured, mpesaFailureReason, queryStkPush } from "@/lib/mpesa";
import { applyPaymentFailure, applyPaymentSuccess } from "@/lib/payments";
import { getIdentity } from "@/lib/firebase/session";
import { createCallerClient } from "@/lib/supabase/server";

/**
 * Payment status for one order, polled by the checkout while the customer
 * enters their PIN.
 *
 * The callback is the normal source of truth. If it hasn't arrived after
 * QUERY_AFTER_MS (Safaricom can be slow, and a callback can be lost), this asks
 * Safaricom directly and applies the answer through the same code path, so the
 * order never stays stuck in awaiting_mpesa.
 */
const QUERY_AFTER_MS = 15_000;

/**
 * Minimum gap between Safaricom queries for one payment. The page polls every
 * 3s; querying Safaricom that often trips its rate limit ("spike arrest"),
 * which would hide the real answer (e.g. wrong PIN) for longer, not shorter.
 * Per server instance, which is enough to keep the rate sane.
 */
const QUERY_EVERY_MS = 9_000;
const lastQueried = new Map<string, number>();

function shouldQuery(checkoutId: string): boolean {
  const now = Date.now();
  const last = lastQueried.get(checkoutId) ?? 0;
  if (now - last < QUERY_EVERY_MS) return false;
  lastQueried.set(checkoutId, now);
  // Keep the map from growing forever on a long-lived instance.
  if (lastQueried.size > 500) {
    for (const [id, at] of lastQueried) if (now - at > 10 * 60_000) lastQueried.delete(id);
  }
  return true;
}

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId || !/^KM-[A-Z0-9]{4,20}$/.test(orderId)) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  }

  const supabase = await createCallerClient(identity);
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, user_id, payment_status, mpesa_checkout_request_id, mpesa_result_code, mpesa_result_desc, updated_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!order || (order.user_id !== identity.uid && !identity.admin)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  let paymentStatus = order.payment_status;
  let reason: string | null =
    paymentStatus === "failed"
      ? mpesaFailureReason(order.mpesa_result_code, order.mpesa_result_desc)
      : null;

  const waitedLongEnough = Date.now() - new Date(order.updated_at).getTime() > QUERY_AFTER_MS;

  if (
    paymentStatus === "initiated" &&
    order.mpesa_checkout_request_id &&
    waitedLongEnough &&
    isMpesaConfigured() &&
    shouldQuery(order.mpesa_checkout_request_id)
  ) {
    try {
      const result = await queryStkPush(order.mpesa_checkout_request_id);
      if (result.state === "paid") {
        await applyPaymentSuccess(order.mpesa_checkout_request_id, {
          receipt: null,
          phone: null,
          resultDesc: result.resultDesc,
        });
        paymentStatus = "paid";
      } else if (result.state === "failed") {
        const failure = await applyPaymentFailure(order.mpesa_checkout_request_id, {
          resultCode: result.resultCode,
          resultDesc: result.resultDesc,
        });
        paymentStatus = "failed";
        reason = failure?.reason ?? mpesaFailureReason(result.resultCode, result.resultDesc);
      }
    } catch (err) {
      // A failed query just means "still waiting"; the next poll tries again.
      console.warn("[mpesa-status] query failed:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ orderId: order.id, paymentStatus, reason });
}
