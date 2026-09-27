"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EmptyState,
  PaymentBadge,
  StatusBadge,
  TD,
  TH,
  formatDateTime,
  formatKes,
} from "@/components/admin/ui";
import {
  createDirectOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
} from "@/app/admin/actions";
import type { OrderWithItems } from "@/lib/supabase/orders";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "awaiting_mpesa",
  "confirmed",
  "packed",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "initiated", "paid", "failed"];

type Filter = "all" | "pending" | "paid" | "unpaid" | "delivered";

export default function OrdersManager({
  orders,
  openDirectOrder = false,
}: {
  orders: OrderWithItems[];
  openDirectOrder?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDirect, setShowDirect] = useState(openDirectOrder);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter === "pending" && order.status !== "pending") return false;
      if (filter === "delivered" && order.status !== "delivered") return false;
      if (filter === "paid" && order.payment_status !== "paid") return false;
      if (filter === "unpaid" && order.payment_status !== "unpaid") return false;
      if (!term) return true;
      return (
        order.id.toLowerCase().includes(term) ||
        order.customer_name.toLowerCase().includes(term) ||
        order.phone.includes(term)
      );
    });
  }, [orders, filter, search]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3">
          <span className="material-symbols-outlined text-base text-red-400">error</span>
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search id, name or phone…"
          className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none"
        />
        <div className="flex flex-wrap gap-1">
          {(["all", "pending", "unpaid", "paid", "delivered"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowDirect(true)}
          className="flex items-center gap-1.5 rounded-lg border border-purple-400/20 bg-purple-400/10 px-3 py-1.5 text-xs font-black text-purple-300 transition-all hover:bg-purple-400/20"
        >
          <span className="material-symbols-outlined text-sm">add</span> Direct Order
        </button>
      </div>

      {showDirect && (
        <DirectOrderForm
          busy={pending}
          onClose={() => setShowDirect(false)}
          onSubmit={(input) =>
            startTransition(async () => {
              const result = await createDirectOrder(input);
              if (!result.ok) setError(result.error);
              else {
                setShowDirect(false);
                router.refresh();
              }
            })
          }
        />
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {visible.length === 0 ? (
          <EmptyState icon="receipt_long" message="No orders match this filter" />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5">
                  <tr>
                    <th className={TH}>Order</th>
                    <th className={TH}>Customer</th>
                    <th className={TH}>Drop point</th>
                    <th className={TH}>Total</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Payment</th>
                    <th className={TH}>Placed</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visible.map((order) => (
                    <Fragment key={order.id}>
                      <tr className="hover:bg-white/5">
                        <td className={`${TD} font-mono font-bold text-white`}>
                          {order.id}
                          {order.source === "admin_direct" && (
                            <span className="ml-1.5 rounded bg-purple-400/15 px-1 py-0.5 text-[8px] font-black uppercase text-purple-300">
                              direct
                            </span>
                          )}
                        </td>
                        <td className={TD}>
                          <span className="block text-white/80">{order.customer_name}</span>
                          <span className="text-[10px] text-white/35">{order.phone}</span>
                        </td>
                        <td className={TD}>{order.drop_point}</td>
                        <td className={`${TD} font-bold text-white`}>
                          {formatKes(order.total)}
                        </td>
                        <td className={TD}>
                          <select
                            value={order.status}
                            disabled={pending}
                            onChange={(e) =>
                              run(() =>
                                updateOrderStatus(order.id, e.target.value as OrderStatus)
                              )
                            }
                            className="rounded border border-white/10 bg-zinc-800 px-1.5 py-1 text-[10px] font-bold uppercase text-white focus:border-purple-400/50 focus:outline-none"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={TD}>
                          <select
                            value={order.payment_status}
                            disabled={pending}
                            onChange={(e) =>
                              run(() =>
                                updatePaymentStatus(order.id, e.target.value as PaymentStatus)
                              )
                            }
                            className="rounded border border-white/10 bg-zinc-800 px-1.5 py-1 text-[10px] font-bold uppercase text-white focus:border-purple-400/50 focus:outline-none"
                          >
                            {PAYMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={`${TD} text-white/40`}>
                          {formatDateTime(order.created_at)}
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded(expanded === order.id ? null : order.id)
                              }
                              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                              aria-label="Toggle items"
                            >
                              <span className="material-symbols-outlined text-base">
                                {expanded === order.id ? "expand_less" : "expand_more"}
                              </span>
                            </button>
                            <DeleteButton
                              busy={pending}
                              onConfirm={() => run(() => deleteOrder(order.id))}
                            />
                          </div>
                        </td>
                      </tr>
                      {expanded === order.id && (
                        <tr className="bg-zinc-950/60">
                          <td colSpan={8} className="px-6 py-3">
                            <OrderItems order={order} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-white/5 md:hidden">
              {visible.map((order) => (
                <div key={order.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-white">{order.id}</p>
                      <p className="text-[11px] text-white/50">{order.customer_name}</p>
                      <p className="text-[10px] text-white/30">{order.phone}</p>
                    </div>
                    <span className="text-sm font-black text-white">
                      {formatKes(order.total)}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40">{order.drop_point}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={order.status} />
                    <PaymentBadge status={order.payment_status} />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={order.status}
                      disabled={pending}
                      onChange={(e) =>
                        run(() => updateOrderStatus(order.id, e.target.value as OrderStatus))
                      }
                      className="flex-1 rounded border border-white/10 bg-zinc-800 px-2 py-1.5 text-[10px] font-bold uppercase text-white"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <select
                      value={order.payment_status}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          updatePaymentStatus(order.id, e.target.value as PaymentStatus)
                        )
                      }
                      className="flex-1 rounded border border-white/10 bg-zinc-800 px-2 py-1.5 text-[10px] font-bold uppercase text-white"
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <DeleteButton
                      busy={pending}
                      onConfirm={() => run(() => deleteOrder(order.id))}
                    />
                  </div>
                  <OrderItems order={order} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OrderItems({ order }: { order: OrderWithItems }) {
  const items = order.order_items ?? [];
  if (items.length === 0) {
    return <p className="text-[10px] font-bold uppercase text-white/25">No line items</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-white/70">
            {item.quantity}× {item.name}
            {item.variant && <span className="text-white/35"> · {item.variant}</span>}
          </span>
          <span className="font-bold text-white/60">
            {formatKes(item.price * item.quantity)}
          </span>
        </li>
      ))}
      {order.notes && (
        <li className="pt-1 text-[10px] italic text-white/35">Note: {order.notes}</li>
      )}
    </ul>
  );
}

/**
 * Two-step delete. The old admin used window.confirm(), which blocks the page
 * and — per the extension notes — can wedge an automated browser session.
 */
function DeleteButton({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
        aria-label="Delete order"
      >
        <span className="material-symbols-outlined text-base">delete</span>
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="rounded bg-red-500/20 px-1.5 py-1 text-[9px] font-black uppercase text-red-300 hover:bg-red-500/30 disabled:opacity-50"
      >
        Sure?
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded p-1 text-white/40 hover:text-white"
        aria-label="Cancel delete"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </span>
  );
}

/** Road-sale order form. Replaces the openRequestPaymentModal() flow. */
function DirectOrderForm({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: {
    customerName: string;
    phone: string;
    dropPoint: string;
    total: number;
    notes?: string;
  }) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [dropPoint, setDropPoint] = useState("Road sale");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          customerName,
          phone,
          dropPoint,
          total: Number(total),
          notes: notes || undefined,
        });
      }}
      className="space-y-3 rounded-xl border border-purple-400/20 bg-zinc-900 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-white">New direct order</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-white/40 hover:text-white"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
          className={inputClass}
        />
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XXXXXXXX"
          className={inputClass}
        />
        <input
          required
          value={dropPoint}
          onChange={(e) => setDropPoint(e.target.value)}
          placeholder="Drop point"
          className={inputClass}
        />
        <input
          required
          type="number"
          min="1"
          step="1"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="Amount (KES)"
          className={inputClass}
        />
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className={inputClass}
      />

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create order"}
      </button>
      <p className="text-[10px] text-white/30">
        Creates an unpaid order you can then charge with an STK push from the order row.
      </p>
    </form>
  );
}
