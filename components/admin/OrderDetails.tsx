"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getOrderDetails, type OrderDetails } from "@/app/admin/actions";
import { PaymentBadge, StatusBadge, formatKes } from "@/components/admin/ui";

const sectionTitle = "mb-2 text-[9px] font-black uppercase tracking-widest text-white/30";

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.startsWith("254") ? `+${phone}` : phone;
}

const SOURCE_LABEL: Record<string, string> = {
  storefront: "Online shop",
  admin_direct: "Admin request",
};

/** Eye button that opens the full order view. */
export default function OrderDetailsButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View order ${orderId}`}
        title="View details"
        className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-purple-300"
      >
        <span className="material-symbols-outlined text-base">visibility</span>
      </button>
      {open && <OrderDetailsModal orderId={orderId} onClose={() => setOpen(false)} />}
    </>
  );
}

function OrderDetailsModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOrderDetails(orderId).then((result) => {
      if (cancelled) return;
      if (result.ok) setDetails(result.details);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 text-left shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/5 bg-zinc-900 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-400/20">
            <span className="material-symbols-outlined text-lg text-purple-300">receipt_long</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="order-details-title" className="font-mono text-sm font-black text-white">
              {orderId}
            </h2>
            <p className="text-[10px] font-bold text-white/30">
              {details ? `Placed ${formatFull(details.order.created_at)}` : "Order details"}
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

        {error ? (
          <div className="m-5 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        ) : !details ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-xs font-bold text-white/40">
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            Loading order…
          </div>
        ) : (
          <OrderBody details={details} />
        )}
      </div>
    </div>
  );
}

function OrderBody({ details }: { details: OrderDetails }) {
  const { order, items, account, failures } = details;
  const paid = order.payment_status === "paid";
  const payerPhone = formatPhone(order.mpesa_phone);

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.payment_status} />
        <span className="ml-auto text-lg font-black text-white">{formatKes(order.total)}</span>
      </div>

      {/* Payment */}
      <section
        className={`rounded-xl border p-4 ${
          paid ? "border-green-400/20 bg-green-400/5" : "border-white/5 bg-white/[0.03]"
        }`}
      >
        <p className={sectionTitle}>Payment</p>
        {paid ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <Field label="Paid by" value={payerPhone ?? formatPhone(order.phone) ?? "—"} strong />
            <Field label="Amount" value={formatKes(order.total)} strong />
            <Field
              label="M-Pesa receipt"
              value={order.mpesa_receipt_number ?? (order.payment_method === "cod" ? "Cash on delivery" : "Marked paid by admin")}
              mono={Boolean(order.mpesa_receipt_number)}
            />
            <Field label="Paid on" value={order.paid_at ? formatFull(order.paid_at) : "—"} />
          </dl>
        ) : (
          <div className="space-y-1 text-xs text-white/60">
            <p className="font-bold text-white">
              {order.payment_status === "initiated"
                ? "M-Pesa prompt sent, waiting for the customer"
                : order.payment_status === "failed"
                  ? "Last payment attempt failed"
                  : "Not paid yet"}
            </p>
            {order.mpesa_result_desc && <p className="text-white/40">Safaricom: {order.mpesa_result_desc}</p>}
            <p className="text-white/40">
              Method: {order.payment_method === "cod" ? "Cash on delivery" : "M-Pesa"}
            </p>
          </div>
        )}
      </section>

      {/* Customer */}
      <section>
        <p className={sectionTitle}>Client</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <Field label="Name" value={order.customer_name} strong />
          <Field label="Phone" value={formatPhone(order.phone) ?? "—"} />
          <Field
            label="Account"
            value={account ? account.email ?? account.fullName ?? "Registered" : "No account"}
          />
          <Field label="Source" value={SOURCE_LABEL[order.source] ?? order.source} />
          <Field label="Drop point" value={order.drop_point} />
          {order.campus && <Field label="Campus" value={order.campus} />}
        </dl>
      </section>

      {/* Items */}
      <section>
        <p className={sectionTitle}>What was bought</p>
        {items.length === 0 ? (
          <p className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs text-white/40">
            No items recorded. This order was created with an amount only.
          </p>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {item.image ? (
                    <Image src={item.image} alt="" fill sizes="40px" className="object-cover" unoptimized />
                  ) : (
                    <span className="material-symbols-outlined absolute inset-0 m-auto h-fit w-fit text-base text-white/25">
                      shopping_bag
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">
                    {item.name}
                    {!item.product_id && order.source === "admin_direct" && (
                      <span className="ml-1.5 rounded bg-amber-400/15 px-1 py-0.5 text-[8px] font-black uppercase text-amber-300">
                        reconcile
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {[item.category, item.variant].filter(Boolean).join(" · ") || "—"} · {item.quantity} ×{" "}
                    {formatKes(item.price)}
                  </p>
                </div>
                <span className="text-xs font-black text-white">{formatKes(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-3 space-y-1 text-xs">
          <Row label="Subtotal" value={formatKes(order.subtotal)} />
          <Row label="Delivery" value={Number(order.delivery_fee) > 0 ? formatKes(order.delivery_fee) : "Free"} />
          <Row label="Total" value={formatKes(order.total)} strong />
        </dl>
      </section>

      {order.notes && (
        <section>
          <p className={sectionTitle}>Notes</p>
          <p className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs text-white/70">{order.notes}</p>
        </section>
      )}

      {/* Timeline */}
      <section>
        <p className={sectionTitle}>Timeline</p>
        <ol className="space-y-2 text-xs">
          <TimelineItem icon="add_shopping_cart" tone="text-white/50" label="Order placed" when={order.created_at} />
          {[...failures].reverse().map((f) => (
            <TimelineItem
              key={f.id}
              icon="cancel"
              tone="text-red-300"
              label={`Payment failed: ${f.reason}`}
              detail={formatPhone(f.phone) ?? undefined}
              when={f.created_at}
            />
          ))}
          {order.paid_at && (
            <TimelineItem
              icon="check_circle"
              tone="text-green-300"
              label={`Paid${order.mpesa_receipt_number ? ` · ${order.mpesa_receipt_number}` : ""}`}
              when={order.paid_at}
            />
          )}
          <TimelineItem icon="update" tone="text-white/30" label="Last updated" when={order.updated_at} />
        </ol>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  strong = false,
  mono = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</dt>
      <dd
        className={`mt-0.5 break-words ${strong ? "font-bold text-white" : "text-white/70"} ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={strong ? "font-black text-white" : "text-white/40"}>{label}</dt>
      <dd className={strong ? "font-black text-white" : "text-white/70"}>{value}</dd>
    </div>
  );
}

function TimelineItem({
  icon,
  tone,
  label,
  detail,
  when,
}: {
  icon: string;
  tone: string;
  label: string;
  detail?: string;
  when: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={`material-symbols-outlined mt-px text-base ${tone}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-white/80">{label}</p>
        {detail && <p className="text-[10px] text-white/40">{detail}</p>}
      </div>
      <span className="shrink-0 text-[10px] text-white/30">{formatFull(when)}</span>
    </li>
  );
}
