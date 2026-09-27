import { NextResponse } from "next/server";
import { getOrderById, updateOrderById } from "@/lib/firebase/orders";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { initiateStkPush, isMpesaConfigured, normalizeKenyanPhone } from "@/lib/mpesa";

interface StkPushBody {
  orderId: string;
  phone: string;
  amount: number;
}

export async function POST(request: Request) {
  try {
    if (!isMpesaConfigured()) {
      return NextResponse.json(
        { error: "M-Pesa is not configured. Add credentials to .env.local" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as StkPushBody;
    const { orderId, phone, amount } = body;

    if (!orderId || !phone || !amount) {
      return NextResponse.json({ error: "orderId, phone, and amount are required" }, { status: 400 });
    }

    if (!normalizeKenyanPhone(phone)) {
      return NextResponse.json({ error: "Invalid Kenyan phone number" }, { status: 400 });
    }

    const result = await initiateStkPush({ phone, amount, orderId });

    if (isFirebaseAdminConfigured()) {
      const order = await getOrderById(orderId);
      if (order) {
        await updateOrderById(orderId, {
          status: "awaiting_mpesa",
          mpesa: {
            checkoutRequestId: result.CheckoutRequestID,
            merchantRequestId: result.MerchantRequestID,
            resultDesc: result.CustomerMessage,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: result.CustomerMessage,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "STK push failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
