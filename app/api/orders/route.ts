import { NextResponse } from "next/server";
import type { CartLine } from "@/lib/cart";
import { deliveryFeeFor, cartSubtotal } from "@/lib/cart";
import { createOrder } from "@/lib/supabase/orders";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getIdentity } from "@/lib/firebase/session";
import { createOrderSchema, parseInput } from "@/lib/validation/schemas";

/**
 * Creates an order for the signed-in user.
 *
 * Two things this route refuses to trust, in order:
 *
 *   1. The shape of the request — `createOrderSchema` parses it, so a malformed
 *      body is one 400 naming the field rather than a failure further in.
 *   2. The money in it. Every line is re-priced against the `products` table and
 *      the delivery fee is recomputed, so the schema having accepted a `price`
 *      changes nothing. An earlier version stored whatever totals the browser
 *      sent, which meant the amount owed was under client control.
 */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase is not configured. Add credentials to .env.local" },
        { status: 503 }
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
    }

    const parsed = parseInput(createOrderSchema, raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const body = parsed.data;

    if (!(await getIdentity())) {
      return NextResponse.json({ error: "You must be signed in to order." }, { status: 401 });
    }

    const supabase = await createClient();

    // Re-price against the catalogue so a tampered client price can't stick.
    const ids = [...new Set(body.lines.map((line) => line.productId))];
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, price, category, images, active")
      .in("id", ids);

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    const catalogue = new Map((products ?? []).map((product) => [product.id, product]));
    const lines: CartLine[] = [];

    for (const line of body.lines) {
      const product = catalogue.get(line.productId);
      if (!product || !product.active) {
        return NextResponse.json(
          { error: `"${line.name}" is no longer available.` },
          { status: 409 }
        );
      }
      // Name, price, image and category all come from the row, not the request.
      lines.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.images?.[0] ?? line.image,
        quantity: line.quantity,
        variant: line.variant,
        category: product.category,
      });
    }

    const subtotal = cartSubtotal(lines);
    const deliveryFee = deliveryFeeFor(subtotal);

    const orderId = await createOrder({
      customerName: body.name,
      // Already normalised to 2547… by the schema, which is the only form
      // Safaricom accepts — so the STK push needs no further cleaning.
      phone: body.phone,
      dropPoint: body.dropPoint,
      campus: body.campus,
      notes: body.notes,
      paymentMethod: body.payment,
      lines,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
    });

    return NextResponse.json({
      orderId,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    console.error("[orders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
