import { Suspense } from "react";
import OrdersClient, { type StoredOrder } from "@/components/orders/OrdersClient";
import { getUserOrders } from "@/lib/supabase/orders";
import { mpesaFailureReason } from "@/lib/mpesa";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata = { title: "My Orders", ...PRIVATE_PAGE };

/**
 * Same page as before; the orders are just fetched from Supabase here and
 * mapped into the shape OrdersClient already rendered, so its markup is
 * untouched.
 */
export default async function OrdersPage() {
  const rows = await getUserOrders();

  const orders: StoredOrder[] = rows.map((order) => ({
    id: order.id,
    createdAt: order.created_at,
    name: order.customer_name,
    phone: order.phone,
    dropPoint: order.drop_point,
    payment: order.payment_method,
    total: Number(order.total),
    status: order.status,
    paymentStatus: order.payment_status,
    failureReason:
      order.payment_status === "failed"
        ? mpesaFailureReason(order.mpesa_result_code, order.mpesa_result_desc)
        : null,
    lines: (order.order_items ?? []).map((line) => ({
      name: line.name,
      quantity: line.quantity,
      price: Number(line.price),
    })),
  }));

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-on-surface-variant font-body-md">
          Loading orders…
        </div>
      }
    >
      <OrdersClient orders={orders} />
    </Suspense>
  );
}
