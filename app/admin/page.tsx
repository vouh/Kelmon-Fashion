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
import { getAdminStats, getOrdersWithStats } from "@/lib/supabase/stats";

export const metadata = { title: "Overview — Kelmon Admin" };

/** Port of admin/index.html. */
export default async function AdminOverviewPage() {
  const [stats, { orders, paid, failed }] = await Promise.all([
    getAdminStats(),
    getOrdersWithStats(),
  ]);

  const recent = orders.slice(0, 10);

  return (
    <AdminShell title="Overview" subtitle="Dashboard summary">
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
          label="Customers"
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

      {/* Quick action — replaces the old "Request Payment" STK modal entry point */}
      <Link
        href="/admin/orders?new=1"
        className="group flex items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-400/10 px-4 py-3 transition-all hover:bg-purple-400/20"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-400/20">
          <span className="material-symbols-outlined text-lg text-purple-300">send_to_mobile</span>
        </div>
        <div>
          <p className="text-xs font-black text-white">Request Payment</p>
          <p className="mt-0.5 text-[9px] font-bold text-white/30">
            Create a direct order and send an STK push
          </p>
        </div>
        <span className="material-symbols-outlined ml-auto text-white/20 transition-colors group-hover:text-white/50">
          chevron_right
        </span>
      </Link>

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
                    <th className={TH}>Customer</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Payment</th>
                    <th className={TH}>Time</th>
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
