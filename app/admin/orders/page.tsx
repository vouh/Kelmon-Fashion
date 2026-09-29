import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import OrdersManager from "@/components/admin/OrdersManager";
import { getAllOrders } from "@/lib/supabase/orders";
import { getProducts } from "@/lib/supabase/products";
import { createClient, getAdminEmail } from "@/lib/supabase/server";
import { accountIdSchema, parseInput } from "@/lib/validation/schemas";

export const metadata = { title: "All Orders — Kelmon Admin" };

/** Port of admin/orders.html. `?user=<uid>` narrows it to one account's orders. */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; user?: string; q?: string }>;
}) {
  const [allOrders, products, params] = await Promise.all([getAllOrders(), getProducts(), searchParams]);

  const userFilter = params.user ? parseInput(accountIdSchema, params.user) : null;
  const userId = userFilter?.ok ? userFilter.data : null;
  const orders = userId ? allOrders.filter((o) => o.user_id === userId) : allOrders;

  let userLabel: string | null = null;
  if (userId) {
    const { data } = await (await createClient())
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    userLabel = data?.full_name || data?.email || orders[0]?.customer_name || "this account";
  }

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell adminEmail={adminEmail} title="All Orders" subtitle={`${orders.length} total`}>
      {userId && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-white/80">
          <span className="material-symbols-outlined text-base text-purple-300">filter_alt</span>
          <span>
            Showing {orders.length} order{orders.length === 1 ? "" : "s"} by <strong className="text-white">{userLabel}</strong>
          </span>
          <Link
            href="/admin/orders"
            className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-purple-300 hover:bg-white/5 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear filter
          </Link>
        </div>
      )}
      <OrdersManager
        key={params.q ?? ""}
        orders={orders}
        products={products}
        openDirectOrder={params.new === "1"}
        initialSearch={params.q?.slice(0, 80) ?? ""}
      />
    </AdminShell>
  );
}
