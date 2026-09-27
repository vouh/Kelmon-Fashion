import AdminShell from "@/components/admin/AdminShell";
import TransactionsTable from "@/components/admin/TransactionsTable";
import { getAllOrders } from "@/lib/supabase/orders";

export const metadata = { title: "Failed Payments — Kelmon Admin" };

/** Port of admin/transactions-failed.html. */
export default async function AdminFailedTransactionsPage() {
  const orders = (await getAllOrders()).filter((o) => o.payment_status === "failed");

  return (
    <AdminShell title="Failed Payments" subtitle={`${orders.length} failed`}>
      <TransactionsTable orders={orders} variant="failed" />
    </AdminShell>
  );
}
