import AdminShell from "@/components/admin/AdminShell";
import TransactionsTable from "@/components/admin/TransactionsTable";
import { getAllOrders } from "@/lib/supabase/orders";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Successful Payments — Kelmon Admin" };

/** Port of admin/transactions.html. */
export default async function AdminTransactionsPage() {
  const orders = (await getAllOrders()).filter((o) => o.payment_status === "paid");

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell adminEmail={adminEmail} title="Successful Payments" subtitle={`${orders.length} received`}>
      <TransactionsTable orders={orders} variant="success" />
    </AdminShell>
  );
}
