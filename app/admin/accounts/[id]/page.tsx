import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { AccountRoleManager, ResendInviteButton } from "@/components/admin/AccountControls";
import { Avatar, RoleBadge } from "@/components/admin/AccountsManager";
import PaymentsTable, { type PaymentEntry } from "@/components/admin/PaymentsTable";
import {
  EmptyState,
  Panel,
  PaymentBadge,
  StatCard,
  StatusBadge,
  TD,
  TH,
  formatDateTime,
  formatKes,
} from "@/components/admin/ui";
import { getAccount } from "@/lib/supabase/accounts";
import { getAdminAccess, getAdminEmail } from "@/lib/supabase/server";
import { accountIdSchema, parseInput } from "@/lib/validation/schemas";

export const metadata = { title: "Account — Kelmon Admin" };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getAdminAccess();
  if (!access?.superAdmin) redirect("/admin");

  const parsed = parseInput(accountIdSchema, (await params).id);
  if (!parsed.ok) notFound();

  const [detail, adminEmail] = await Promise.all([getAccount(parsed.data), getAdminEmail()]);
  if (!detail) notFound();
  const { account, orders, failures } = detail;

  const payments: PaymentEntry[] = [
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
          at: o.paid_at ?? o.updated_at,
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

  const name = account.fullName || account.email || "Account";

  return (
    <AdminShell adminEmail={adminEmail} title={name} subtitle="Account details, orders and payments">
      <Link
        href="/admin/accounts"
        className="inline-flex items-center gap-1 text-xs font-bold text-white/50 hover:text-white"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        All accounts
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="Profile" padded>
          <div className="flex items-start gap-3">
            <Avatar name={account.fullName} email={account.email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{account.fullName || "No name"}</p>
              <p className="truncate text-xs text-white/50">{account.email ?? "—"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={account.role} owner={account.owner} />
                {account.pendingInvite && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
                    Invite pending
                  </span>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {[
              ["Phone", account.phone ?? "—"],
              ["Campus", account.campus ?? "—"],
              ["Joined", formatDate(account.createdAt)],
              ["Last sign-in", account.lastSignInAt ? formatDateTime(account.lastSignInAt) : account.pendingInvite ? "Not yet" : "—"],
              ["Loyalty points", String(account.loyaltyPoints)],
              ["Account ID", account.id],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</dt>
                <dd className={`mt-0.5 truncate text-white/80 ${label === "Account ID" ? "font-mono text-[10px]" : ""}`}>{value}</dd>
              </div>
            ))}
          </dl>

          {account.pendingInvite && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="mb-2 text-[11px] text-white/50">
                They haven&apos;t set a password yet. Invite links expire after 1 hour.
              </p>
              <ResendInviteButton accountId={account.id} />
            </div>
          )}
        </Panel>

        <Panel title="Role & access" hint="Who can use the admin dashboard" padded>
          <AccountRoleManager
            accountId={account.id}
            currentRole={account.role}
            isOwnerAccount={account.owner}
            isSelf={account.id === access.uid}
            viewerIsOwner={access.owner}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders" value={account.orders} hint={account.lastOrderAt ? `Last ${formatDate(account.lastOrderAt)}` : "None yet"} icon="receipt_long" iconColor="text-blue-400" />
        <StatCard label="Total spent" value={formatKes(account.spent)} hint="Paid orders" icon="savings" iconColor="text-green-400" />
        <StatCard label="Successful payments" value={account.paidPayments} icon="check_circle" iconColor="text-green-400" />
        <StatCard label="Failed payments" value={account.failedPayments} icon="cancel" iconColor="text-red-400" />
      </div>

      <Panel
        title="Orders"
        hint={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
        action={
          orders.length > 0 ? (
            <Link
              href={`/admin/orders?user=${encodeURIComponent(account.id)}`}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-purple-300 hover:text-white"
            >
              Manage in All Orders
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </Link>
          ) : undefined
        }
      >
        {orders.length === 0 ? (
          <EmptyState icon="receipt_long" message="No orders yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr>
                  <th className={TH}>Order</th>
                  <th className={TH}>Items</th>
                  <th className={TH}>Total</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Payment</th>
                  <th className={TH}>Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className={`${TD} font-mono font-bold text-white`}>{o.id}</td>
                    <td className={TD}>
                      {o.order_items[0]?.name ?? "—"}
                      {o.order_items.length > 1 && (
                        <span className="text-white/40"> +{o.order_items.length - 1} more</span>
                      )}
                    </td>
                    <td className={`${TD} font-bold text-white`}>{formatKes(Number(o.total))}</td>
                    <td className={TD}>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className={TD}>
                      <PaymentBadge status={o.payment_status} />
                    </td>
                    <td className={`${TD} text-white/40`}>{formatDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <PaymentsTable entries={payments} initialFilter="all" />
    </AdminShell>
  );
}
