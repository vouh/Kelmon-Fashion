import { NextResponse } from "next/server";
import { awardLoyaltyPoints, updateOrderByCheckoutId } from "@/lib/supabase/orders";

/**
 * Safaricom STK callback.
 *
 * Ported from api/callback.js, keeping its most important property: ALWAYS
 * answer HTTP 200 with a ResultCode of 0, even on our own errors. Anything else
 * and Safaricom retries the callback repeatedly.
 */

interface CallbackItem {
  Name: string;
  Value?: string | number;
}

interface StkCallback {
  CheckoutRequestID: string;
  MerchantRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: { Item?: CallbackItem[] };
}

function metaValue(items: CallbackItem[], name: string): string | null {
  const found = items.find((i) => i.Name === name);
  return found?.Value !== undefined ? String(found.Value) : null;
}

/** Safaricom's ACK. Never vary the shape of this. */
function ack(desc: string) {
  return NextResponse.json({ ResultCode: 0, ResultDesc: desc });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { Body?: { stkCallback?: StkCallback } };
    const callback = body?.Body?.stkCallback;

    if (!callback?.CheckoutRequestID) {
      console.error("[mpesa-callback] missing stkCallback:", JSON.stringify(body));
      return ack("Received");
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;
    console.log(
      `[mpesa-callback] checkout=${CheckoutRequestID} code=${ResultCode} desc=${ResultDesc}`
    );

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item ?? [];
      const receipt = metaValue(items, "MpesaReceiptNumber");
      const payerPhone = metaValue(items, "PhoneNumber");

      const orderId = await updateOrderByCheckoutId(CheckoutRequestID, {
        status: "confirmed",
        payment_status: "paid",
        mpesa_receipt_number: receipt,
        mpesa_result_desc: ResultDesc,
        ...(payerPhone ? { mpesa_phone: payerPhone } : {}),
      });

      if (!orderId) {
        console.warn("[mpesa-callback] no order for checkout id", CheckoutRequestID);
        return ack("ACK - order not found");
      }

      // Award points after the order is marked paid. The SQL function is
      // idempotent, so a duplicate callback cannot double-award.
      const points = await awardLoyaltyPoints(orderId);
      console.log(`[mpesa-callback] order ${orderId} PAID (${receipt}), +${points} pts`);

      return ack("Success");
    }

    // Failed or cancelled: mark the payment failed but leave the order pending
    // so the customer can retry, matching the old callback's behaviour.
    await updateOrderByCheckoutId(CheckoutRequestID, {
      status: "pending",
      payment_status: "failed",
      mpesa_result_desc: ResultDesc,
    });

    console.log(`[mpesa-callback] payment failed (${ResultCode}): ${ResultDesc}`);
    return ack("Success");
  } catch (err) {
    // Swallow and ACK — a 500 here would trigger Safaricom's retry loop.
    console.error("[mpesa-callback] processing error:", err);
    return ack("ACK");
  }
}

/** Safaricom probes the URL with GET on some setups; answer politely. */
export async function GET() {
  return ack("Ignored");
}
