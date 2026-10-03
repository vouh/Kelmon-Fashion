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
import { deleteOrder, updateOrderStatus, updatePaymentStatus } from "@/app/admin/actions";
import { bulkDeleteOrders } from "@/app/admin/bulk-actions";
import ApprovalCodeModal from "@/components/admin/ApprovalCodeModal";
import OrderDetailsButton from "@/components/admin/OrderDetails";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import RequestPaymentModal from "@/components/admin/RequestPaymentModal";
import LinkOrderModal from "@/components/admin/LinkOrderModal";
import { sendStkPrompt, waitForPaymentResult } from "@/components/payments/MpesaPayment";
import type { Product } from "@/lib/products";
import type { OrderWithItems } from "@/lib/supabase/orders";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";
import { searchAnchor } from "@/lib/admin-search";

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

/** A direct order (quick STK or typed-in item) still to be matched to a product. */
function needsReconciling(order: OrderWithItems): boolean {
  return order.source === "admin_direct" && (order.order_items ?? []).some((item) => !item.product_id);
}

export default function OrdersManager({
  orders,
  products,
  openDirectOrder = false,
  initialSearch = "",
}: {
  orders: OrderWithItems[];
  products: Product[];
  openDirectOrder?: boolean;
  /** Pre-filled search, from ?q= (the admin topbar search links here). */
  initialSearch?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState(initialSearch);
  const [expanded, setExpanded] = useState<string | null>(
    orders.some((o) => o.id === initialSearch) ? initialSearch : null
  );
  const [showDirect, setShowDirect] = useState(openDirectOrder);
  const [error, setError] = useState<string | null>(null);
  const [stkSending, setStkSending] = useState<string | null>(null);
  /** Live result of the last prompt per order: waiting, paid, or why it failed. */
  const [stkResult, setStkResult] = useState<
    Record<string, { tone: "info" | "success" | "error"; text: string }>
  >({});
  /** Orders ticked for bulk delete. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Paid orders waiting on the emailed approval code. */
  const [paidToApprove, setPaidToApprove] = useState<string[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  /** The order whose yellow "!" was tapped: link it to a client / products. */
  const [linking, setLinking] = useState<OrderWithItems | null>(null);
  const confirm = useConfirm();

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

  const shownSelected = visible.filter((order) => selected.has(order.id));
  const allShownSelected = visible.length > 0 && shownSelected.length === visible.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allShownSelected ? new Set() : new Set(visible.map((order) => order.id)));
  }

  /** Unpaid orders go straight away; paid ones need a super admin's emailed code. */
  async function deleteSelected() {
    const paid = shownSelected.filter((order) => order.payment_status === "paid").map((order) => order.id);
    const unpaid = shownSelected.filter((order) => order.payment_status !== "paid").map((order) => order.id);
    const ok = await confirm({
      title: `Delete ${shownSelected.length} order${shownSelected.length === 1 ? "" : "s"}?`,
      message: paid.length
        ? `${unpaid.length ? `${unpaid.length} unpaid will be deleted now. ` : ""}${paid.length} paid order${paid.length === 1 ? "" : "s"} need${paid.length === 1 ? "s" : ""} an approval code emailed to the super admins.`
        : "Their items are deleted too. This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    setFlash(null);
    startTransition(async () => {
      if (unpaid.length) {
        const result = await bulkDeleteOrders(unpaid);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setFlash(result.message);
      }
      setSelected(new Set(paid));
      if (paid.length) setPaidToApprove(paid);
      router.refresh();
    });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  /**
   * Sends the prompt, then waits for M-Pesa's answer so staff see the real
   * outcome — paid, or the reason it failed (wrong PIN, cancelled, timeout,
   * insufficient funds…) — instead of just "sent".
   */
  async function sendStkPush(order: OrderWithItems) {
    setError(null);
    setStkSending(order.id);
    const show = (tone: "info" | "success" | "error", text: string) =>
      setStkResult((prev) => ({ ...prev, [order.id]: { tone, text } }));

    // The server reads the amount from this order, so staff cannot alter the
    // payment total in the browser before a Safaricom prompt is sent.
    const sent = await sendStkPrompt(order.id, order.phone);
    setStkSending(null);
    if (!sent.ok) {
      show("error", `Prompt not sent: ${sent.reason}`);
      return;
    }
    show("info", `Prompt sent to ${order.phone}. Waiting for the customer to enter their PIN…`);
    router.refresh();

    const result = await waitForPaymentResult(order.id);
    if (result.outcome === "paid") show("success", "Paid ✓ — M-Pesa confirmed the payment.");
    else if (result.outcome === "failed") show("error", `Payment failed: ${result.reason}`);
    else if (result.outcome === "timeout") show("error", "No answer from M-Pesa yet. Check again shortly or resend.");
    router.refresh();
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
      </div>

      {linking && (
        <LinkOrderModal
          order={linking}
          products={products}
          onClose={() => setLinking(null)}
          onLinked={(newId) => {
            const oldId = linking.id;
            setFlash(newId === oldId ? `Linked order ${oldId}.` : `Linked. Order ${oldId} is now ${newId}.`);
          }}
        />
      )}

      {/* Opened by ?new=1; the page header has the New Order button. */}
      <RequestPaymentModal open={showDirect} onClose={() => setShowDirect(false)} products={products} />

      {flash && (
        <div className="rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-xs text-green-300" role="status">
          {flash}
        </div>
      )}
      {shownSelected.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-purple-400/30 bg-zinc-900/95 px-4 py-2.5 shadow-lg backdrop-blur">
          <span className="text-xs font-bold text-white">{shownSelected.length} selected</span>
          <button type="button" onClick={() => setSelected(new Set())} className="text-[11px] text-white/50 hover:text-white">
            Clear
          </button>
          <span className="flex-1" />
          <button
            type="button"
            disabled={pending}
            onClick={() => void deleteSelected()}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">delete</span> Delete selected
          </button>
        </div>
      )}
      {paidToApprove && (
        <ApprovalCodeModal
          orderIds={paidToApprove}
          failureIds={[]}
          summary={`${paidToApprove.length} paid order${paidToApprove.length === 1 ? "" : "s"}`}
          onClose={() => setPaidToApprove(null)}
          onDone={(message) => {
            setPaidToApprove(null);
            setSelected(new Set());
            setFlash(message);
            router.refresh();
          }}
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
                    <th className={`${TH} w-8`}>
                      <input
                        type="checkbox"
                        checked={allShownSelected}
                        onChange={toggleAll}
                        aria-label="Select all orders shown"
                        className="h-3.5 w-3.5 accent-purple-500"
                      />
                    </th>
                    <th className={TH}>Order</th>
                    <th className={TH}>Client</th>
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
                      <tr id={searchAnchor("order", order.id)} className={selected.has(order.id) ? "bg-purple-500/10" : "hover:bg-white/5"}>
                        <td className={TD}>
                          <input
                            type="checkbox"
                            checked={selected.has(order.id)}
                            onChange={() => toggle(order.id)}
                            aria-label={`Select order ${order.id}`}
                            className="h-3.5 w-3.5 accent-purple-500"
                          />
                        </td>
                        <td className={`${TD} font-mono font-bold text-white`}>
                          {order.id}
                          {order.source === "admin_direct" && (
                            <span className="ml-1.5 rounded bg-purple-400/15 px-1 py-0.5 text-[8px] font-black uppercase text-purple-300">
                              direct
                            </span>
                          )}
                          {needsReconciling(order) && <LinkFlag onClick={() => setLinking(order)} />}
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
                            {order.payment_status !== "paid" && (
                              <button
                                type="button"
                                disabled={pending || stkSending === order.id}
                                onClick={() => void sendStkPush(order)}
                                className="rounded px-1.5 py-1 text-[9px] font-black uppercase tracking-wide text-purple-300 hover:bg-purple-400/10 disabled:opacity-50"
                                aria-label={`Send M-Pesa prompt to ${order.customer_name}`}
                              >
                                {stkSending === order.id ? "Sending…" : "Send STK"}
                              </button>
                            )}
                            <OrderDetailsButton orderId={order.id} />
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
                      {stkResult[order.id] && (
                        <tr>
                          <td colSpan={9} className="px-4 pb-2.5 pt-0">
                            <StkNotice {...stkResult[order.id]} />
                          </td>
                        </tr>
                      )}
                      {expanded === order.id && (
                        <tr className="bg-zinc-950/60">
                          <td colSpan={9} className="px-6 py-3">
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
              <label className="flex items-center gap-2.5 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                <input
                  type="checkbox"
                  checked={allShownSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-purple-500"
                />
                Select all
              </label>
              {visible.map((order) => (
                <div key={order.id} className={`space-y-2 px-4 py-3 ${selected.has(order.id) ? "bg-purple-500/10" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggle(order.id)}
                      aria-label={`Select order ${order.id}`}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-purple-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-white">
                        {order.id}
                        {needsReconciling(order) && <LinkFlag onClick={() => setLinking(order)} />}
                      </p>
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
                    <OrderDetailsButton orderId={order.id} />
                    <DeleteButton
                      busy={pending}
                      onConfirm={() => run(() => deleteOrder(order.id))}
                    />
                  </div>
                  {order.payment_status !== "paid" && (
                    <button
                      type="button"
                      disabled={pending || stkSending === order.id}
                      onClick={() => void sendStkPush(order)}
                      className="w-full rounded-lg border border-purple-400/25 bg-purple-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-purple-300 hover:bg-purple-400/20 disabled:opacity-50"
                    >
                      {stkSending === order.id ? "Sending M-Pesa prompt…" : "Send M-Pesa STK prompt"}
                    </button>
                  )}
                  {stkResult[order.id] && <StkNotice {...stkResult[order.id]} />}
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

const STK_TONES = {
  info: "border-blue-400/25 bg-blue-400/10 text-blue-200",
  success: "border-green-400/25 bg-green-400/10 text-green-300",
  error: "border-red-400/30 bg-red-400/10 text-red-300",
} as const;

function StkNotice({ tone, text }: { tone: keyof typeof STK_TONES; text: string }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${STK_TONES[tone]}`}>
      {text}
    </p>
  );
}

/** Yellow "!" on an order that still needs its client / products linked. */
function LinkFlag({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Link a client and products"
      aria-label="Link a client and products"
      className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 align-middle text-xs font-black text-black shadow shadow-amber-500/40 transition hover:scale-110"
    >
      !
    </button>
  );
}
