"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inviteAccount } from "@/app/admin/account-actions";
import { EmptyState, Panel, StatCard, TD, TH, formatKes, timeAgo } from "@/components/admin/ui";
import { ROLE_LABELS, type AccountRole } from "@/lib/auth/roles";
import type { AccountSummary } from "@/lib/supabase/accounts";
import { EMAIL_PATTERN } from "@/lib/validation/credentials";

type Filter = "all" | AccountRole | "pending";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "super_admin", label: "Super admins" },
  { value: "admin", label: "Admins" },
  { value: "customer", label: "Users" },
  { value: "pending", label: "Invite pending" },
];

const ROLE_STYLE: Record<AccountRole, string> = {
  super_admin: "border-pink-400/20 bg-pink-400/10 text-pink-300",
  admin: "border-purple-400/20 bg-purple-400/10 text-purple-300",
  customer: "border-white/10 bg-white/5 text-white/60",
};

export function RoleBadge({ role }: { role: AccountRole }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${ROLE_STYLE[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export function Avatar({ name, email }: { name: string | null; email: string | null }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-black text-purple-300">
      {(name || email || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function AccountsManager({ accounts }: { accounts: AccountSummary[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const count = (value: Filter) =>
    value === "all"
      ? accounts.length
      : value === "pending"
        ? accounts.filter((a) => a.pendingInvite).length
        : accounts.filter((a) => a.role === value).length;

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (filter === "pending" ? !a.pendingInvite : filter !== "all" && a.role !== filter) return false;
      if (!term) return true;
      return [a.fullName, a.email, a.phone, a.campus].some((v) => v?.toLowerCase().includes(term));
    });
  }, [accounts, filter, search]);

  const totals = useMemo(
    () => ({
      admins: accounts.filter((a) => a.role !== "customer").length,
      orders: accounts.reduce((s, a) => s + a.orders, 0),
      paid: accounts.reduce((s, a) => s + a.paidPayments, 0),
      failed: accounts.reduce((s, a) => s + a.failedPayments, 0),
    }),
    [accounts]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Accounts" value={accounts.length} hint={`${count("pending")} invite pending`} icon="group" iconColor="text-pink-300" />
        <StatCard label="Team" value={totals.admins} hint="Super admins + admins" icon="admin_panel_settings" />
        <StatCard label="Orders" value={totals.orders} hint="By registered users" icon="receipt_long" iconColor="text-blue-400" />
        <StatCard
          label="Payments"
          value={
            <span>
              <span className="text-green-300">{totals.paid}</span>
              <span className="text-white/20"> / </span>
              <span className="text-red-300">{totals.failed}</span>
            </span>
          }
          hint="Successful / failed"
          icon="payments"
          iconColor="text-green-400"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-white/30">
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone or campus"
            aria-label="Search accounts"
            maxLength={100}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-purple-500"
          />
        </label>
        <div role="tablist" aria-label="Filter accounts" className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-zinc-900 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                filter === f.value ? "bg-purple-600 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {f.label} <span className="opacity-70">({count(f.value)})</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen((v) => !v)}
          aria-expanded={inviteOpen}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white shadow shadow-purple-600/30 hover:bg-purple-500"
        >
          <span className="material-symbols-outlined text-base">{inviteOpen ? "close" : "person_add"}</span>
          {inviteOpen ? "Close" : "Invite account"}
        </button>
      </div>

      {inviteOpen && <InviteForm onDone={() => router.refresh()} />}

      <Panel title="Registered accounts" hint={`${shown.length} shown`}>
        {shown.length === 0 ? (
          <EmptyState icon="group" message={search || filter !== "all" ? "No accounts match" : "No accounts yet"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr>
                  <th className={TH}>Account</th>
                  <th className={TH}>Role</th>
                  <th className={TH}>Phone / campus</th>
                  <th className={TH}>Orders</th>
                  <th className={TH}>Payments</th>
                  <th className={TH}>Spent</th>
                  <th className={TH}>Joined</th>
                  <th className={TH}>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5">
                    <td className={TD}>
                      <Link href={`/admin/accounts/${a.id}`} className="flex items-center gap-2.5">
                        <Avatar name={a.fullName} email={a.email} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-white">{a.fullName || "No name"}</span>
                          <span className="block truncate text-[11px] text-white/40">{a.email ?? "—"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={TD}>
                      <div className="flex flex-col items-start gap-1">
                        <RoleBadge role={a.role} />
                        {a.pendingInvite && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-300">Invite pending</span>
                        )}
                      </div>
                    </td>
                    <td className={TD}>
                      <span className="block">{a.phone ?? "—"}</span>
                      <span className="block text-[11px] text-white/40">{a.campus ?? ""}</span>
                    </td>
                    <td className={TD}>
                      {a.orders > 0 ? (
                        <Link
                          href={`/admin/orders?user=${encodeURIComponent(a.id)}`}
                          className="font-black text-white underline-offset-4 hover:text-purple-300 hover:underline"
                          title="See this user's orders"
                        >
                          {a.orders}
                        </Link>
                      ) : (
                        <span className="text-white/30">0</span>
                      )}
                      {a.lastOrderAt && <span className="block text-[10px] text-white/30">{timeAgo(a.lastOrderAt)}</span>}
                    </td>
                    <td className={TD}>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 font-bold text-green-300" title="Successful payments">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          {a.paidPayments}
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-bold text-red-300" title="Failed payments">
                          <span className="material-symbols-outlined text-xs">cancel</span>
                          {a.failedPayments}
                        </span>
                      </span>
                    </td>
                    <td className={`${TD} font-bold text-white`}>{a.spent > 0 ? formatKes(a.spent) : "—"}</td>
                    <td className={`${TD} text-white/40`}>{formatDate(a.createdAt)}</td>
                    <td className={TD}>
                      <Link
                        href={`/admin/accounts/${a.id}`}
                        aria-label={`Manage ${a.fullName || a.email || "account"}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"customer" | "admin">("admin");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSent(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > 254) {
      setError("Enter a valid email address.");
      return;
    }
    if (fullName.trim().length > 120) {
      setError("Name must be 120 characters or fewer.");
      return;
    }

    startTransition(async () => {
      const result = await inviteAccount({ email: cleanEmail, fullName: fullName.trim(), role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(result.message ?? `Invite sent to ${cleanEmail}.`);
      setEmail("");
      setFullName("");
      onDone();
    });
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-purple-500";

  return (
    <Panel title="Invite an account" hint="They get a Kelmon email with a link to set their password" padded>
      <form onSubmit={submit} noValidate className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto_auto] md:items-end">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Email *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="off"
            maxLength={254}
            required
            aria-invalid={Boolean(error && error.toLowerCase().includes("email"))}
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Name (optional)</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Their full name"
            autoComplete="off"
            maxLength={120}
            className={input}
          />
        </label>
        <fieldset>
          <legend className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Role</legend>
          <div className="inline-flex rounded-xl border border-white/10 bg-zinc-950 p-1">
            {(["admin", "customer"] as const).map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                  role === value ? "bg-purple-600 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="invite-role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                {ROLE_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base">send</span>
          {pending ? "Sending…" : "Send invite"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="mt-3 rounded-lg border border-green-400/20 bg-green-400/10 px-3 py-2 text-xs font-bold text-green-300">
          {sent} The link expires in 1 hour; you can resend it from their account page.
        </p>
      )}
    </Panel>
  );
}
