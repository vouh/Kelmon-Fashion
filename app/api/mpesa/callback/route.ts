import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { updateOrderMpesa } from "@/lib/firebase/orders";

/** Safaricom Daraja STK callback payload */
interface StkCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item?: { Name: string; Value?: string | number }[];
      };
    };
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StkCallbackBody;
    const callback = body.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    if (isFirebaseAdminConfigured()) {
      const receipt = CallbackMetadata?.Item?.find((i) => i.Name === "MpesaReceiptNumber")?.Value as
        | string
        | undefined;

      await updateOrderMpesa(CheckoutRequestID, {
        checkoutRequestId: CheckoutRequestID,
        receiptNumber: receipt,
        resultDesc: ResultDesc,
        status: ResultCode === 0 ? "paid" : "failed",
      });
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
