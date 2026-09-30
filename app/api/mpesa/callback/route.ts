import { NextResponse } from "next/server";
import { applyPaymentFailure, applyPaymentSuccess } from "@/lib/payments";
import { isMpesaConfigured, queryStkPush } from "@/lib/mpesa";

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

    if (Number(ResultCode) === 0) {
      // This URL is public and the checkout id reaches the customer's browser,
      // so a "paid" callback is only believed once Safaricom confirms it. If
      // the check can't be made now, the order stays pending and the status
      // poll confirms it with Safaricom later.
      let confirmed = false;
      try {
        confirmed = isMpesaConfigured() && (await queryStkPush(CheckoutRequestID)).state === "paid";
      } catch (err) {
        console.warn("[mpesa-callback] could not confirm with Safaricom:", err instanceof Error ? err.message : err);
      }
      if (!confirmed) {
        console.warn("[mpesa-callback] success not confirmed by Safaricom; left pending", CheckoutRequestID);
        return ack("ACK - pending confirmation");
      }

      const items = CallbackMetadata?.Item ?? [];
      const receipt = metaValue(items, "MpesaReceiptNumber");

      // Marks the order paid; the orders_deduct_stock trigger takes the items
      // off the shelf in the same write, then points are awarded and the
      // customer is emailed.
      const orderId = await applyPaymentSuccess(CheckoutRequestID, {
        receipt,
        phone: metaValue(items, "PhoneNumber"),
        resultDesc: ResultDesc,
      });

      if (!orderId) {
        console.warn("[mpesa-callback] no pending order for checkout id", CheckoutRequestID);
        return ack("ACK - order not found");
      }
      console.log(`[mpesa-callback] order ${orderId} PAID (${receipt})`);
      return ack("Success");
    }

    // Failed or cancelled (wrong PIN, timeout, insufficient funds…): logged to
    // payment_failures, order left pending for a retry, customer emailed.
    const failure = await applyPaymentFailure(CheckoutRequestID, {
      resultCode: Number(ResultCode),
      resultDesc: ResultDesc,
    });
    console.log(
      `[mpesa-callback] payment failed (${ResultCode}): ${failure?.reason ?? ResultDesc}`
    );
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
