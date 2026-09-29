import AdminShell from "@/components/admin/AdminShell";
import PaymentsTable, { type PaymentEntry, type PaymentFilter } from "@/components/admin/PaymentsTable";
import { getAllOrders, getPaymentFailures } from "@/lib/supabase/orders";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Payments — Kelmon Admin" };

/**
 * Successful and failed payments on one page. Successes are paid orders;
 * failures come from the payment_failures log, one row per failed attempt, so
 * an order that failed and was later paid appears under both.
 */
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ filter }, orders, failures, adminEmail] = await Promise.all([
    searchParams,
    getAllOrders(),
    getPaymentFailures(),
    getAdminEmail(),
  ]);

  const entries: PaymentEntry[] = [
    ...orders
      .filter((o) => o.payment_status === "paid")
      .map(
        (o): PaymentEntry => ({
          id: `paid-${o.id}`,
          kind: "success",
          orderId: o.id,
          customer: o.customer_name,
          amount: Number(o.total),
          phone: o.mpesa_phone ?? o.phone,
          method: o.payment_method,
          receipt: o.mpesa_receipt_number,
          detail: null,
          at: o.updated_at,
        })
      ),
    ...failures.map(
      (f): PaymentEntry => ({
        id: `failed-${f.id}`,
        kind: "failed",
        orderId: f.order_id,
        customer: orders.find((o) => o.id === f.order_id)?.customer_name ?? null,
        amount: f.amount !== null ? Number(f.amount) : null,
        phone: f.phone,
        method: "mpesa",
        receipt: null,
        detail: f.reason,
        at: f.created_at,
      })
    ),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const initialFilter: PaymentFilter =
    filter === "success" || filter === "failed" ? filter : "all";

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Payments"
      subtitle={`${entries.length} payment${entries.length === 1 ? "" : "s"}`}
    >
      <PaymentsTable entries={entries} initialFilter={initialFilter} />
    </AdminShell>
  );
}
