"use client";

import { useState } from "react";
import { EmptyState, Panel, TD, TH, formatDateTime, formatKes } from "@/components/admin/ui";

export type PaymentFilter = "all" | "success" | "failed";

export interface PaymentEntry {
  id: string;
  kind: "success" | "failed";
  orderId: string | null;
  customer: string | null;
  amount: number | null;
  phone: string | null;
  method: string;
  receipt: string | null;
  /** Failure reason, for failed entries. */
  detail: string | null;
  at: string;
}

const FILTERS: { value: PaymentFilter; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "list" },
  { value: "success", label: "Successful", icon: "check_circle" },
  { value: "failed", label: "Failed", icon: "cancel" },
];

/** Payments with an All / Successful / Failed toggle. */
export default function PaymentsTable({
  entries,
  initialFilter,
}: {
  entries: PaymentEntry[];
  initialFilter: PaymentFilter;
}) {
  const [filter, setFilter] = useState<PaymentFilter>(initialFilter);

  const successes = entries.filter((e) => e.kind === "success");
  const failures = entries.filter((e) => e.kind === "failed");
  const received = successes.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const successRate = entries.length
    ? Math.round((successes.length / entries.length) * 100)
    : null;

  const shown = filter === "all" ? entries : filter === "success" ? successes : failures;
  const count = (value: PaymentFilter) =>
    value === "all" ? entries.length : value === "success" ? successes.length : failures.length;

  function choose(value: PaymentFilter) {
    setFilter(value);
    // Keep the choice in the URL so a refresh or shared link opens the same view.
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", value);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Received" value={formatKes(received)} hint={`${successes.length} successful`} tone="text-green-300" />
        <Stat label="Failed attempts" value={String(failures.length)} hint="Wrong PIN, timeout, low balance…" tone="text-red-300" />
        <Stat
          label="Success rate"
          value={successRate === null ? "—" : `${successRate}%`}
          hint={`of ${entries.length} attempts`}
          tone="text-purple-300"
        />
      </div>

      <div
        role="tablist"
        aria-label="Filter payments"
        className="inline-flex rounded-xl border border-white/10 bg-zinc-900 p-1"
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => choose(f.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
              filter === f.value
                ? f.value === "failed"
                  ? "bg-red-500/80 text-white"
                  : f.value === "success"
                    ? "bg-green-600 text-white"
                    : "bg-purple-600 text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{f.icon}</span>
            {f.label}
            <span className="opacity-70">({count(f.value)})</span>
          </button>
        ))}
      </div>

      <Panel
        title={FILTERS.find((f) => f.value === filter)!.label + " payments"}
        hint={`${shown.length} · ${formatKes(shown.reduce((s, e) => s + (e.amount ?? 0), 0))}`}
      >
        {shown.length === 0 ? (
          <EmptyState
            icon={filter === "failed" ? "cancel" : "payments"}
            message={filter === "failed" ? "No failed payments" : "No payments yet"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr>
                  <th className={TH}>Status</th>
                  <th className={TH}>Order</th>
                  <th className={TH}>Customer</th>
                  <th className={TH}>Amount</th>
                  <th className={TH}>Phone</th>
                  <th className={TH}>Receipt / reason</th>
                  <th className={TH}>When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((e) => (
                  <tr key={e.id} className="hover:bg-white/5">
                    <td className={TD}>
                      {e.kind === "success" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[10px] font-bold text-green-300">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                          <span className="material-symbols-outlined text-xs">cancel</span>
                          Failed
                        </span>
                      )}
                    </td>
                    <td className={`${TD} font-mono font-bold text-white`}>{e.orderId ?? "—"}</td>
                    <td className={TD}>{e.customer ?? "—"}</td>
                    <td className={`${TD} font-bold text-white`}>
                      {e.amount !== null ? formatKes(e.amount) : "—"}
                    </td>
                    <td className={TD}>{e.phone ?? "—"}</td>
                    <td className={TD}>
                      {e.kind === "success" ? (
                        <span className="font-mono">
                          {e.receipt ?? (e.method === "cod" ? "Cash on delivery" : "—")}
                        </span>
                      ) : (
                        <span className="text-red-300/80">{e.detail}</span>
                      )}
                    </td>
                    <td className={`${TD} text-white/40`}>{formatDateTime(e.at)}</td>
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

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone}`}>{value}</p>
      <p className="text-[10px] text-white/35">{hint}</p>
    </div>
  );
}
