import type { CartLine } from "@/lib/cart";

export type OrderStatus =
  | "pending"
  | "awaiting_mpesa"
  | "paid"
  | "confirmed"
  | "failed"
  | "cancelled";

export interface OrderRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  phone: string;
  dropPoint: string;
  payment: "mpesa" | "cod";
  notes?: string;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  mpesa?: {
    checkoutRequestId?: string;
    merchantRequestId?: string;
    receiptNumber?: string;
    resultDesc?: string;
  };
}

export function createOrderId(): string {
  return `KM-${Date.now().toString(36).toUpperCase()}`;
}
