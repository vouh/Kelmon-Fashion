import { NextResponse } from "next/server";
import { cartSubtotal, deliveryFeeFor, type CartLine } from "@/lib/cart";
import { createOrder } from "@/lib/supabase/orders";
import { createClient } from "@/lib/supabase/server";
import { getIdentity } from "@/lib/firebase/session";
import { normalizeKenyanPhone } from "@/lib/mpesa";

/** Creates a one-item M-Pesa order. Delivery details are confirmed with the customer after payment. */
export async function POST(request: Request) {
  try {
    const { productId, quantity, variant, phone } = (await request.json()) as {
      productId?: string; quantity?: number; variant?: string; phone?: string;
    };
    if (!productId || !Number.isInteger(quantity) || quantity! < 1 || quantity! > 99) {
      return NextResponse.json({ error: "Choose a product and quantity." }, { status: 400 });
    }
    // Checked before anything is saved, so a mistyped number never leaves an
    // unpayable order behind. Stored as 2547… — the only form Safaricom takes.
    const mpesaPhone = normalizeKenyanPhone(phone ?? "");
    if (!mpesaPhone) {
      return NextResponse.json(
        { error: "Enter a valid Safaricom number, e.g. 0712 345 678." },
        { status: 400 }
      );
    }
    const identity = await getIdentity();
    if (!identity) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    const supabase = await createClient();
    const { data: product, error } = await supabase
      .from("products").select("id, name, price, category, images, active, stock").eq("id", productId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!product || !product.active || product.stock <= 0) {
      return NextResponse.json({ error: "Sorry, this product is sold out." }, { status: 409 });
    }
    if (product.stock < quantity!) {
      return NextResponse.json(
        { error: `Only ${product.stock} left in stock — lower the quantity and try again.` },
        { status: 409 }
      );
    }
    // The customer's name from their profile, for the order and receipts.
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", identity.uid)
      .maybeSingle();
    const line: CartLine = {
      productId: product.id, name: product.name, price: Number(product.price),
      image: product.images?.[0] ?? "", quantity: quantity!, variant: variant || undefined, category: product.category,
    };
    const subtotal = cartSubtotal([line]);
    const deliveryFee = deliveryFeeFor(subtotal);
    const orderId = await createOrder({
      customerName: profile?.full_name?.trim() || identity.email || "Customer",
      phone: mpesaPhone,
      dropPoint: "Delivery to be arranged",
      notes: "Buy Now order — arrange delivery with customer.", paymentMethod: "mpesa", lines: [line],
      subtotal, deliveryFee, total: subtotal + deliveryFee,
    });
    return NextResponse.json({ orderId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not start payment." }, { status: 500 });
  }
}
