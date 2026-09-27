import AdminShell from "@/components/admin/AdminShell";
import OrdersManager from "@/components/admin/OrdersManager";
import { getAllOrders } from "@/lib/supabase/orders";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "All Orders — Kelmon Admin" };

/** Port of admin/orders.html. */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [orders, params] = await Promise.all([getAllOrders(), searchParams]);

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell adminEmail={adminEmail} title="All Orders" subtitle={`${orders.length} total`}>
      <OrdersManager orders={orders} openDirectOrder={params.new === "1"} />
    </AdminShell>
  );
}
