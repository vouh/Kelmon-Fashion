import AdminShell from "@/components/admin/AdminShell";
import OrdersManager from "@/components/admin/OrdersManager";
import { getAllOrders } from "@/lib/supabase/orders";

export const metadata = { title: "All Orders — Kelmon Admin" };

/** Port of admin/orders.html. */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [orders, params] = await Promise.all([getAllOrders(), searchParams]);

  return (
    <AdminShell title="All Orders" subtitle={`${orders.length} total`}>
      <OrdersManager orders={orders} openDirectOrder={params.new === "1"} />
    </AdminShell>
  );
}
