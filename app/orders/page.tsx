import { Suspense } from "react";
import OrdersClient from "@/components/orders/OrdersClient";

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-on-surface-variant font-body-md">
          Loading orders…
        </div>
      }
    >
      <OrdersClient />
    </Suspense>
  );
}
