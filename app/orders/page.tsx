import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { formatKes } from "@/lib/products";
import { getUserOrders } from "@/lib/supabase/orders";
import { getCurrentUser } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

export const metadata = { title: "My Orders — Kelmon" };

/**
 * Orders now come from Supabase rather than the localStorage mirror this page
 * used before accounts existed.
 */

const STATUS_COPY: Record<OrderStatus, string> = {
  pending: "Pending",
  awaiting_mpesa: "Awaiting M-Pesa",
  confirmed: "Confirmed",
  packed: "Packed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_COPY: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  initiated: "Payment started",
  paid: "Paid",
  failed: "Payment failed",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ placed }, user] = await Promise.all([searchParams, getCurrentUser()]);

  if (!user) {
    return (
      <AppShell activeNav="orders">
        <main className="mx-auto w-full max-w-3xl flex-1 px-margin-mobile py-lg md:px-margin-desktop">
          <h1 className="mb-2 font-display-md text-display-md text-on-surface">My Orders</h1>
          <p className="mb-8 font-body-md text-body-md text-on-surface-variant">
            Sign in to see your orders and track delivery.
          </p>
          <Link
            href="/signin?next=/orders"
            className="btn-primary inline-flex h-12 items-center rounded-lg px-8 font-button-text text-button-text text-white"
          >
            Sign in
          </Link>
        </main>
      </AppShell>
    );
  }

  const orders = await getUserOrders();
  const latest = placed ? orders.find((o) => o.id === placed) : null;

  return (
    <AppShell activeNav="orders">
      <main className="mx-auto w-full max-w-3xl flex-1 px-margin-mobile py-lg md:px-margin-desktop">
        <h1 className="mb-2 font-display-md text-display-md text-on-surface">My Orders</h1>
        <p className="mb-8 font-body-md text-body-md text-on-surface-variant">
          Every order on your account, newest first.
        </p>

        {latest && (
          <div
            role="status"
            className="mb-8 space-y-2 rounded-xl border border-secondary/40 bg-secondary/10 p-6"
          >
            <p className="font-title-lg text-title-lg text-on-surface">Order placed</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Reference <span className="font-semibold text-secondary">{latest.id}</span> ·{" "}
              {formatKes(Number(latest.total))}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {latest.payment_method === "mpesa"
                ? "We’ll confirm M-Pesa and deliver to your campus drop point."
                : "Pay on delivery at your selected drop point."}
            </p>
            <Link
              href="/shop"
              className="mt-2 inline-flex font-label-caps text-label-caps uppercase tracking-wider text-secondary hover:text-primary"
            >
              Keep shopping →
            </Link>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="space-y-4 py-8">
            <p className="font-body-lg text-body-lg text-on-surface-variant">No orders yet.</p>
            <Link
              href="/shop"
              className="btn-primary inline-flex h-12 items-center rounded-lg px-8 font-button-text text-button-text text-white"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="glass-panel space-y-2 rounded-xl p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <span className="font-title-lg text-base text-on-surface">{order.id}</span>
                  <span className="font-body-md text-body-md text-secondary">
                    {formatKes(Number(order.total))}
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {new Date(order.created_at).toLocaleString("en-KE")} · {order.drop_point}
                </p>
                <p className="font-body-md text-sm text-on-surface-variant">
                  {(order.order_items ?? [])
                    .map((line) => `${line.name} ×${line.quantity}`)
                    .join(", ")}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <p className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">
                    {STATUS_COPY[order.status]}
                  </p>
                  <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                    {PAYMENT_COPY[order.payment_status]}
                  </p>
                  {order.mpesa_receipt_number && (
                    <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                      Receipt {order.mpesa_receipt_number}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
