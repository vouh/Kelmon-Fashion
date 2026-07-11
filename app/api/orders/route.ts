import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { saveOrder } from "@/lib/firebase/orders";
import type { CartLine } from "@/lib/cart";
import { createOrderId, type OrderRecord } from "@/lib/orders";

interface CreateOrderBody {
  name: string;
  phone: string;
  dropPoint: string;
  payment: "mpesa" | "cod";
  notes?: string;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderBody;

    if (!body.name?.trim() || !body.phone?.trim() || !body.lines?.length) {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const order: OrderRecord = {
      id: createOrderId(),
      createdAt: now,
      updatedAt: now,
      name: body.name.trim(),
      phone: body.phone.trim(),
      dropPoint: body.dropPoint,
      payment: body.payment,
      notes: body.notes?.trim(),
      lines: body.lines,
      subtotal: body.subtotal,
      deliveryFee: body.deliveryFee,
      total: body.total,
      status: body.payment === "mpesa" ? "awaiting_mpesa" : "confirmed",
    };

    if (isFirebaseAdminConfigured()) {
      await saveOrder(order);
    }

    return NextResponse.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
