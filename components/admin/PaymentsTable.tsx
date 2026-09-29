"use client";

import { useEffect, useState } from "react";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import { EmptyState, Panel, TD, TH, formatDateTime, formatKes } from "@/components/admin/ui";
import { dateRangeBounds, dateRangeLabel, isInDateRange, writeDateRangeToUrl, type DateRange } from "@/lib/date-range";

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
  /** M-Pesa's own result code and message, shown in the details popup. */
  resultCode?: number | null;
  resultDesc?: string | null;
  items?: { name: string; quantity: number; price: number; variant?: string | null }[];
  dropPoint?: string | null;
  orderStatus?: string | null;
  orderedAt?: string | null;
  at: string;
}

const FILTERS: { value: PaymentFilter; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "list" },
  { value: "success", label: "Successful", icon: "check_circle" },
  { value: "failed", label: "Failed", icon: "cancel" },
];

/** Payments with an All / Successful / Failed toggle and a date-range filter. */
export default function PaymentsTable({
  entries: allEntries,
  initialFilter,
  initialRange = { preset: "all" },
}: {
  entries: PaymentEntry[];
  initialFilter: PaymentFilter;
  initialRange?: DateRange;
}) {
  const [filter, setFilter] = useState<PaymentFilter>(initialFilter);
  const [range, setRange] = useState<DateRange>(initialRange);
  const [viewing, setViewing] = useState<PaymentEntry | null>(null);

  const bounds = dateRangeBounds(range);
  const entries = allEntries.filter((e) => isInDateRange(e.at, bounds));
  const dated = range.preset !== "all";

  function chooseRange(value: DateRange) {
    setRange(value);
    writeDateRangeToUrl(value);
  }

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

      <div className="flex flex-wrap items-stretch gap-2">
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
        <DateRangeFilter value={range} onChange={chooseRange} />
      </div>

      <Panel
        title={FILTERS.find((f) => f.value === filter)!.label + " payments"}
        hint={`${shown.length} · ${formatKes(shown.reduce((s, e) => s + (e.amount ?? 0), 0))}${dated ? ` · ${dateRangeLabel(range)}` : ""}`}
      >
        {shown.length === 0 ? (
          <EmptyState
            icon={filter === "failed" ? "cancel" : "payments"}
            message={
              dated
                ? `No ${filter === "failed" ? "failed " : filter === "success" ? "successful " : ""}payments in this period`
                : filter === "failed"
                  ? "No failed payments"
                  : "No payments yet"
            }
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
                  <th className={TH}>When</th>
                  <th className={`${TH} text-right`}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer hover:bg-white/5"
                    onClick={() => setViewing(e)}
                  >
                    <td className={TD}>
                      <StatusPill kind={e.kind} />
                    </td>
                    <td className={`${TD} whitespace-nowrap font-mono font-bold text-white`}>{e.orderId ?? "—"}</td>
                    <td className={`${TD} max-w-[180px] truncate`}>{e.customer ?? "—"}</td>
                    <td className={`${TD} whitespace-nowrap font-bold text-white`}>
                      {e.amount !== null ? formatKes(e.amount) : "—"}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-white/40`}>{formatDateTime(e.at)}</td>
                    <td className={`${TD} text-right`}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewing(e);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-purple-500/15 hover:text-purple-200"
                        aria-label={`View details of ${e.kind === "success" ? "payment" : "failed payment"} for ${e.orderId ?? "order"}`}
                        title="View details"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {viewing && <PaymentDetails entry={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function StatusPill({ kind }: { kind: PaymentEntry["kind"] }) {
  return kind === "success" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[10px] font-bold text-green-300">
      <span className="material-symbols-outlined text-xs">check_circle</span>
      Paid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
      <span className="material-symbols-outlined text-xs">cancel</span>
      Failed
    </span>
  );
}

/** Everything about one payment, opened with the eye button. */
function PaymentDetails({ entry: e, onClose }: { entry: PaymentEntry; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const success = e.kind === "success";
  const rows: [string, React.ReactNode][] = [
    ["Order", e.orderId ? <span className="font-mono font-bold text-white">{e.orderId}</span> : "—"],
    ["Customer", e.customer ?? "—"],
    ["Phone", e.phone ?? "—"],
    ["Amount", e.amount !== null ? <span className="font-bold text-white">{formatKes(e.amount)}</span> : "—"],
    ["Method", e.method === "cod" ? "Pay on delivery" : "M-Pesa"],
    [success ? "Paid at" : "Failed at", formatDateTime(e.at)],
  ];
  if (success) rows.push(["M-Pesa receipt", e.receipt ? <span className="font-mono">{e.receipt}</span> : e.method === "cod" ? "Cash on delivery" : "—"]);
  if (e.dropPoint) rows.push(["Drop point", e.dropPoint]);
  if (e.orderStatus) rows.push(["Order status", e.orderStatus.replace(/_/g, " ")]);
  if (e.orderedAt) rows.push(["Ordered", formatDateTime(e.orderedAt)]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm animate-[confirm-fade_0.15s_ease-out] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-details-title"
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-900 shadow-2xl animate-[confirm-pop_0.18s_cubic-bezier(0.22,1,0.36,1)] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              success ? "bg-green-400/15 text-green-300" : "bg-red-400/15 text-red-300"
            }`}
          >
            <span className="material-symbols-outlined text-xl">{success ? "check_circle" : "cancel"}</span>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="payment-details-title" className="text-sm font-black text-white">
              {success ? "Payment received" : "Payment failed"}
            </h2>
            <p className="text-[11px] text-white/40">
              {e.amount !== null ? formatKes(e.amount) : ""} · {formatDateTime(e.at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {!success && (
            <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-300/70">Reason</p>
              <p className="mt-1 text-sm text-red-200">{e.detail ?? "Unknown"}</p>
              {(e.resultCode !== null && e.resultCode !== undefined) || e.resultDesc ? (
                <p className="mt-2 text-[11px] text-red-200/50">
                  M-Pesa{e.resultCode !== null && e.resultCode !== undefined ? ` code ${e.resultCode}` : ""}
                  {e.resultDesc ? `: ${e.resultDesc}` : ""}
                </p>
              ) : null}
            </div>
          )}

          <dl className="divide-y divide-white/5 rounded-xl border border-white/5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                <dt className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</dt>
                <dd className="text-right text-xs text-white/75">{value}</dd>
              </div>
            ))}
          </dl>

          {e.items && e.items.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-white/30">Items</p>
              <ul className="divide-y divide-white/5 rounded-xl border border-white/5">
                {e.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                    <span className="min-w-0 truncate text-white/80">
                      {item.name}
                      {item.variant && <span className="text-white/35"> · {item.variant}</span>}
                      <span className="text-white/35"> × {item.quantity}</span>
                    </span>
                    <span className="shrink-0 font-bold text-white">{formatKes(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {e.orderId && (
          <div className="border-t border-white/5 px-5 py-3">
            <a
              href={`/admin/orders?q=${encodeURIComponent(e.orderId)}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-purple-500"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Open order
            </a>
          </div>
        )}
      </div>
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
