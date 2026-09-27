import AdminShell from "@/components/admin/AdminShell";
import BarChart from "@/components/admin/BarChart";
import { StatCard, formatKes } from "@/components/admin/ui";
import { getOrdersWithStats } from "@/lib/supabase/stats";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Statistics — Kelmon Admin" };

/**
 * Port of admin/stats.html.
 *
 * Status colors are the reserved set (good / warning / critical) and always ship
 * with an icon and a label, so state is never carried by color alone.
 */
const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

export default async function AdminStatsPage() {
  const { orders, days, paid, failed, unpaid } = await getOrdersWithStats();

  const revenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const avgOrder = paid > 0 ? Math.round(revenue / paid) : 0;
  const conversion = orders.length ? Math.round((paid / orders.length) * 100) : 0;

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell adminEmail={adminEmail} title="Statistics" subtitle="Last 7 days">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatKes(revenue)}
          hint="Paid orders"
          icon="payments"
          iconColor="text-green-400"
        />
        <StatCard
          label="Avg order"
          value={formatKes(avgOrder)}
          hint="Per paid order"
          icon="shopping_bag"
        />
        <StatCard
          label="Conversion"
          value={`${conversion}%`}
          hint="Orders that paid"
          icon="trending_up"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Orders"
          value={orders.length}
          hint="All time"
          icon="receipt_long"
        />
      </div>

      {/* Two measures, two charts — never one dual-axis chart. */}
      <div className="grid gap-3 md:grid-cols-2">
        <BarChart
          title="Orders per day"
          data={days.map((d) => ({ label: d.label, value: d.count }))}
        />
        <BarChart
          title="Revenue per day"
          data={days.map((d) => ({ label: d.label, value: Math.round(d.revenue) }))}
          valueFormat="kes"
        />
      </div>

      <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
        <h3 className="mb-3 text-xs font-black text-white">Payment outcomes</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Paid", value: paid, color: STATUS.good, icon: "check_circle" },
            { label: "Unpaid", value: unpaid, color: STATUS.warning, icon: "hourglass_top" },
            { label: "Failed", value: failed, color: STATUS.critical, icon: "cancel" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-base"
                style={{ color: item.color }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <div>
                <span className="block text-[9px] font-black uppercase tracking-widest text-white/30">
                  {item.label}
                </span>
                <span className="text-lg font-black" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Proportion bar — 2px surface gaps keep the segments legible */}
        {orders.length > 0 && (
          <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {[
              { value: paid, color: STATUS.good },
              { value: unpaid, color: STATUS.warning },
              { value: failed, color: STATUS.critical },
            ]
              .filter((s) => s.value > 0)
              .map((s, i) => (
                <div
                  key={i}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(s.value / orders.length) * 100}%`,
                    backgroundColor: s.color,
                  }}
                />
              ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
