import { NextResponse } from "next/server";
import type { CartLine } from "@/lib/cart";
import { deliveryFeeFor, cartSubtotal } from "@/lib/cart";
import { createOrder } from "@/lib/supabase/orders";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/supabase/types";

interface CreateOrderBody {
  name: string;
  phone: string;
  dropPoint: string;
  campus?: string;
  payment: PaymentMethod;
  notes?: string;
  lines: CartLine[];
}

/**
 * Creates an order for the signed-in user.
 *
 * Money is recomputed here from the submitted line prices and the delivery-fee
 * rule; the client's subtotal/total are ignored. The previous version stored
 * whatever totals the request supplied.
 */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase is not configured. Add credentials to .env.local" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as CreateOrderBody;

    if (!body.name?.trim() || !body.phone?.trim() || !body.dropPoint?.trim()) {
      return NextResponse.json(
        { error: "Name, phone and drop point are required." },
        { status: 400 }
      );
    }
    if (!body.lines?.length) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "You must be signed in to order." }, { status: 401 });
    }

    // Re-price against the catalogue so a tampered client price can't stick.
    const ids = [...new Set(body.lines.map((l) => l.productId))];
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, price, category, images, active")
      .in("id", ids);

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    const catalogue = new Map((products ?? []).map((p) => [p.id, p]));
    const lines: CartLine[] = [];

    for (const line of body.lines) {
      const product = catalogue.get(line.productId);
      if (!product || !product.active) {
        return NextResponse.json(
          { error: `"${line.name}" is no longer available.` },
          { status: 409 }
        );
      }
      const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
      lines.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.images?.[0] ?? line.image,
        quantity,
        variant: line.variant,
        category: product.category,
      });
    }

    const subtotal = cartSubtotal(lines);
    const deliveryFee = deliveryFeeFor(subtotal);

    const orderId = await createOrder({
      customerName: body.name.trim(),
      phone: body.phone.trim(),
      dropPoint: body.dropPoint.trim(),
      campus: body.campus?.trim(),
      notes: body.notes?.trim(),
      paymentMethod: body.payment === "cod" ? "cod" : "mpesa",
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
