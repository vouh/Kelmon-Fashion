import AdminShell from "@/components/admin/AdminShell";
import TransactionsTable from "@/components/admin/TransactionsTable";
import { getAllOrders } from "@/lib/supabase/orders";

export const metadata = { title: "Successful Payments — Kelmon Admin" };

/** Port of admin/transactions.html. */
export default async function AdminTransactionsPage() {
  const orders = (await getAllOrders()).filter((o) => o.payment_status === "paid");

  return (
    <AdminShell title="Successful Payments" subtitle={`${orders.length} received`}>
      <TransactionsTable orders={orders} variant="success" />
    </AdminShell>
  );
}
