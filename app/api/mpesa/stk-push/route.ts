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
import { createServiceClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createCallerClient>>;

/**
 * How long a sent prompt counts as "still on the customer's phone". Safaricom
 * expires an unanswered STK prompt after about a minute; until then a second
 * prompt for the same order is refused, so nobody can approve two and pay
 * twice. A prompt that already came back failed (wrong PIN, cancelled…)
 * doesn't block a retry.
 */
const PROMPT_LIVE_MS = 75_000;

/** A customer-facing message if any line can't be filled, otherwise null. */
async function findStockShortage(supabase: Supabase, orderId: string): Promise<string | null> {
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, name, quantity")
    .eq("order_id", orderId);

  const wanted = new Map<string, { name: string; quantity: number }>();
  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const prev = wanted.get(item.product_id);
    wanted.set(item.product_id, {
      name: item.name,
      quantity: (prev?.quantity ?? 0) + item.quantity,
    });
  }
  if (wanted.size === 0) return null;

  const { data: products } = await supabase
    .from("products")
    .select("id, stock, active")
    .in("id", [...wanted.keys()]);
  const stock = new Map((products ?? []).map((p) => [p.id, p.active ? p.stock : 0]));

  for (const [id, line] of wanted) {
    const available = stock.get(id) ?? 0;
    if (available <= 0) return `"${line.name}" is sold out.`;
    if (available < line.quantity) return `Only ${available} of "${line.name}" left in stock.`;
  }
  return null;
}

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

    // Don't take money for something that sold out since the order was placed
    // (another customer paid first, or the admin took it off the shelf).
    const shortage = await findStockShortage(supabase, order.id);
    if (shortage) {
      return NextResponse.json({ error: shortage }, { status: 409 });
    }

    const service = createServiceClient();
    const mpesaPhone = normalizeKenyanPhone(phone);

    // Atomic claim: only one request can move this order into "prompt sent".
    // A double-click, a fast retry or an admin resend while a prompt is still
    // live all fail this condition instead of sending a second prompt.
    const cutoff = new Date(Date.now() - PROMPT_LIVE_MS).toISOString();
    const { data: claimed, error: claimError } = await service
      .from("orders")
      .update({
        status: "awaiting_mpesa",
        payment_status: "initiated",
        mpesa_requested_at: new Date().toISOString(),
        mpesa_phone: mpesaPhone,
      })
      .eq("id", order.id)
      .neq("payment_status", "paid")
      .or(`payment_status.neq.initiated,mpesa_requested_at.is.null,mpesa_requested_at.lt.${cutoff}`)
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);

    if (!claimed) {
      const { data: now } = await service
        .from("orders")
        .select("payment_status, mpesa_requested_at")
        .eq("id", order.id)
        .maybeSingle();
      if (now?.payment_status === "paid") {
        return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
      }
      const waitSeconds = now?.mpesa_requested_at
        ? Math.max(
            5,
            Math.ceil((new Date(now.mpesa_requested_at).getTime() + PROMPT_LIVE_MS - Date.now()) / 1000)
          )
        : 60;
      return NextResponse.json(
        {
          error: `A payment prompt is already on your phone. Complete or cancel it there, or wait about ${waitSeconds} seconds and try again.`,
          alreadyPending: true,
          retryAfter: waitSeconds,
        },
        { status: 409 }
      );
    }

    let result;
    try {
      result = await initiateStkPush({
        phone,
        amount: Number(order.total),
        orderId: order.id,
      });
    } catch (err) {
      // Safaricom refused or never answered: no prompt exists, so release the
      // claim and let the customer try again straight away.
      await service
        .from("orders")
        .update({
          status: "pending",
          payment_status: order.payment_status === "initiated" ? "unpaid" : order.payment_status,
          mpesa_requested_at: null,
        })
        .eq("id", order.id)
        .neq("payment_status", "paid");
      throw err;
    }

    // Every prompt is recorded, so a payment on this one is matched to the
    // order even after a newer prompt replaces it on the order row.
    const { error: requestError } = await service.from("mpesa_requests").insert({
      checkout_request_id: result.CheckoutRequestID,
      merchant_request_id: result.MerchantRequestID,
      order_id: order.id,
      phone: mpesaPhone,
      amount: Number(order.total),
    });
    if (requestError) console.error("[stk-push] could not record request:", requestError.message);

    const { error: updateError } = await service
      .from("orders")
      .update({
        mpesa_checkout_request_id: result.CheckoutRequestID,
        mpesa_merchant_request_id: result.MerchantRequestID,
        mpesa_result_desc: result.CustomerMessage,
      })
      .eq("id", order.id)
      .neq("payment_status", "paid");
    if (updateError) console.error("[stk-push] could not save checkout id:", updateError.message);

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
