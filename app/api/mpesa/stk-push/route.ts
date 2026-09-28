import { NextResponse } from "next/server";
import {
  MpesaError,
  initiateStkPush,
  isMpesaConfigured,
  missingMpesaConfig,
  normalizeKenyanPhone,
} from "@/lib/mpesa";
import { createCallerClient } from "@/lib/supabase/server";
import { getIdentity } from "@/lib/firebase/session";
import { updateOrderByIdAsService } from "@/lib/supabase/orders";

interface StkPushBody {
  orderId: string;
  phone: string;
}

/**
 * Starts an STK push for an existing order.
 *
 * The amount is read from the order row rather than the request body — the old
 * api/stkpush.js trusted a client-supplied `amount`, which let a caller charge
 * themselves any figure they liked for a real order.
 */
export async function POST(request: Request) {
  try {
    if (!isMpesaConfigured()) {
      return NextResponse.json(
        {
          error: "M-Pesa is not configured.",
          missing: missingMpesaConfig(),
        },
        { status: 503 }
      );
    }

    const { orderId, phone } = (await request.json()) as StkPushBody;

    if (!orderId || !phone) {
      return NextResponse.json({ error: "orderId and phone are required" }, { status: 400 });
    }
    if (!normalizeKenyanPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Use 07XXXXXXXX or 2547XXXXXXXX." },
        { status: 400 }
      );
    }

    const identity = await getIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // With a live ID token RLS scopes this read to the caller's own orders (or
    // any order for an admin). On the session-cookie fallback RLS is bypassed,
    // so the owner check below does that job instead.
    const supabase = await createCallerClient(identity);
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, total, payment_status, user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!order || (order.user_id !== identity.uid && !identity.admin)) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.payment_status === "paid") {
      return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
    }

    const result = await initiateStkPush({
      phone,
      amount: Number(order.total),
      orderId: order.id,
    });

    // Service-role write: the RLS update policy doesn't let a customer move an
    // order into awaiting_mpesa, and these columns are payment bookkeeping.
    await updateOrderByIdAsService(order.id, {
      status: "awaiting_mpesa",
      payment_status: "initiated",
      mpesa_checkout_request_id: result.CheckoutRequestID,
      mpesa_merchant_request_id: result.MerchantRequestID,
      mpesa_result_desc: result.CustomerMessage,
      mpesa_phone: normalizeKenyanPhone(phone),
    });

    return NextResponse.json({
      success: true,
      message: result.CustomerMessage ?? "STK push sent. Enter your M-Pesa PIN.",
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
    });
  } catch (err) {
    if (err instanceof MpesaError) {
      console.error("[stk-push]", err.message, err.details);
      return NextResponse.json(
        { error: err.message, details: err.details, hint: err.hint },
        { status: 502 }
      );
    }
    const message = err instanceof Error ? err.message : "STK push failed";
    console.error("[stk-push]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
