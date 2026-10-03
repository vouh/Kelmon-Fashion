import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import {
  EmptyState,
  Panel,
  PaymentBadge,
  StatCard,
  StatusBadge,
  TD,
  TH,
  formatKes,
  timeAgo,
} from "@/components/admin/ui";
import OrderDetailsButton from "@/components/admin/OrderDetails";
import QuickStkButton from "@/components/admin/QuickStkButton";
import RequestPaymentButton from "@/components/admin/RequestPaymentButton";
import { getAdminStats, getOrdersWithStats } from "@/lib/supabase/stats";
import { getProducts } from "@/lib/supabase/products";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Overview — Kelmon Admin" };

/** Port of admin/index.html. */
export default async function AdminOverviewPage() {
  const [stats, { orders, paid, failed }, products] = await Promise.all([
    getAdminStats(),
    getOrdersWithStats(),
    getProducts(),
  ]);

  const recent = orders.slice(0, 10);

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Overview"
      subtitle="Dashboard summary"
      actions={
        <>
          <QuickStkButton />
          <RequestPaymentButton products={products} />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          hint="All time"
          icon="receipt_long"
        />
        <StatCard
          label="Revenue"
          value={formatKes(stats.totalRevenue)}
          hint="Paid only"
          icon="payments"
          iconColor="text-green-400"
        />
        <StatCard
          label="Pending"
          value={stats.pendingOrders}
          hint="Awaiting action"
          icon="hourglass_top"
          iconColor="text-amber-400"
        />
        <StatCard
          label="Clients"
          value={stats.totalUsers}
          hint="Registered"
          icon="group"
          iconColor="text-blue-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900 p-3">
          <span className="material-symbols-outlined text-base text-green-400">check_circle</span>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-white/30">
              Paid
            </span>
            <span className="text-lg font-black text-green-400">{paid}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900 p-3">
          <span className="material-symbols-outlined text-base text-red-400">cancel</span>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-white/30">
              Failed
            </span>
            <span className="text-lg font-black text-red-400">{failed}</span>
          </div>
        </div>
      </div>

      <Panel
        title="Recent Orders"
        hint="Latest 10"
        action={
          <Link
            href="/admin/orders"
            className="text-[9px] font-black uppercase tracking-widest text-purple-300 transition-colors hover:text-white"
          >
            View All →
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState icon="receipt_long" message="No orders yet" />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5">
                  <tr>
                    <th className={TH}>Order</th>
                    <th className={TH}>Value</th>
                    <th className={TH}>Client</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Payment</th>
                    <th className={TH}>Time</th>
                    <th className={TH}>
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5">
                      <td className={`${TD} font-mono font-bold text-white`}>{order.id}</td>
                      <td className={`${TD} font-bold text-white`}>{formatKes(order.total)}</td>
                      <td className={TD}>{order.customer_name}</td>
                      <td className={TD}>
                        <StatusBadge status={order.status} />
                      </td>
                      <td className={TD}>
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td className={`${TD} text-white/40`}>{timeAgo(order.created_at)}</td>
                      <td className={`${TD} w-10 text-right`}>
                        <OrderDetailsButton orderId={order.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-white/5 md:hidden">
              {recent.map((order) => (
                <div key={order.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{order.id}</span>
                    <span className="text-xs font-black text-white">
                      {formatKes(order.total)}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50">{order.customer_name}</p>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={order.status} />
                    <PaymentBadge status={order.payment_status} />
                    <span className="ml-auto text-[9px] font-bold text-white/25">
                      {timeAgo(order.created_at)}
                    </span>
                    <OrderDetailsButton orderId={order.id} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </AdminShell>
  );
}
