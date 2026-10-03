"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatKes } from "@/components/admin/ui";
import { createDirectOrder } from "@/app/admin/actions";
import ProductPicker from "@/components/admin/ProductPicker";
import type { Product } from "@/lib/products";

type Step = "form" | "sending" | "waiting" | "paid" | "failed" | "recorded";
type PaidMethod = "mpesa" | "cash";

/** One row of the order. No `product` means a typed-in item. */
interface Line {
  key: number;
  product: Product | null;
  name: string;
  size: string;
  color: string;
  price: string;
  quantity: number;
}

const POLL_MS = 4_000;
const GIVE_UP_MS = 150_000;

// text-base on phones: iOS zooms the page into any input under 16px.
const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-3 text-base text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none disabled:opacity-60 sm:text-sm";
const miniInputClass =
  "rounded-lg border border-white/10 bg-zinc-800 px-2 py-1.5 text-base text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none disabled:opacity-60 sm:text-xs";

let nextKey = 1;

function lineFor(product: Product | null, name = ""): Line {
  return {
    key: nextKey++,
    product,
    name: product?.name ?? name,
    size: "",
    color: "",
    price: product ? String(product.price) : "",
    quantity: 1,
  };
}

function lineTotal(line: Line): number {
  const price = Number(line.price);
  return price > 0 ? price * line.quantity : 0;
}

/** "Black / M", the same shape the storefront saves. */
function variantOf(line: Line): string | undefined {
  return [line.color, line.size].filter(Boolean).join(" / ") || undefined;
}

interface RequestPaymentModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
}

/**
 * New order, entered by staff — mostly on a phone. Search, tap a product, set
 * the quantity, then either send the customer an M-Pesa prompt or mark it as
 * already paid (cash, or M-Pesa sent straight to the till). Customer details
 * aren't asked for; the order is filed as a walk-in.
 */
export default function RequestPaymentModal({ open, onClose, products }: RequestPaymentModalProps) {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  /** The "how was it paid?" step under Mark as paid. */
  const [paidOpen, setPaidOpen] = useState(false);
  /** The Send STK window stacked on top of the order. */
  const [stkOpen, setStkOpen] = useState(false);
  const [paidMethod, setPaidMethod] = useState<PaidMethod>("mpesa");
  const [reference, setReference] = useState("");

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const busy = step === "sending";
  /** Once an STK order exists the form only resends the prompt. */
  const locked = orderId !== null;
  const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);


  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPhone("");
    setLines([]);
    setPaidOpen(false);
    setStkOpen(false);
    setPaidMethod("mpesa");
    setReference("");
    setStep("form");
    setError(null);
    setOrderId(null);
    setFailReason(null);
  }

  function close() {
    if (busy) return;
    const hadOrder = orderId !== null;
    reset();
    onClose();
    if (hadOrder) router.refresh();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Esc steps back out of the STK window before closing the order.
      if (stkOpen && !orderId) {
        if (!busy) setStkOpen(false);
      } else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close() only reads state that is current on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy, orderId, stkOpen]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  function addProduct(product: Product) {
    setLines((prev) => {
      // Picking the same plain product again just adds one more.
      const hasOptions = (product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 0;
      const existing = !hasOptions && prev.find((line) => line.product?.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line
        );
      }
      return [...prev, lineFor(product)];
    });
    setError(null);
  }

  function addTypedItem(name: string) {
    setLines((prev) => [...prev, lineFor(null, name)]);
    setError(null);
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }

  function watchPayment(id: string) {
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setFailReason("No answer from M-Pesa yet. Check the order later, or resend the prompt from the orders list.");
        setStep("failed");
        return;
      }
      try {
        const response = await fetch(`/api/mpesa/status?orderId=${encodeURIComponent(id)}`);
        if (!response.ok) return;
        const data = (await response.json()) as { paymentStatus: string; reason: string | null };
        if (data.paymentStatus === "paid") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("paid");
        } else if (data.paymentStatus === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setFailReason(data.reason ?? "The customer cancelled or the payment failed.");
          setStep("failed");
        }
      } catch {
        // A dropped poll just means "still waiting".
      }
    }, POLL_MS);
  }

  /** Checks the items; returns an error message, or null when they're good. */
  function itemsProblem(): string | null {
    if (lines.length === 0) return "Add a product first.";
    for (const line of lines) {
      if (!line.name.trim()) return "Type a name for the typed-in item.";
      if (!(Number(line.price) > 0)) return `Enter a price for ${line.name.trim()}.`;
    }
    return null;
  }

  async function createOrder(paid?: { method: PaidMethod; reference?: string }): Promise<string | null> {
    const typedIn = lines.some((line) => !line.product);
    const result = await createDirectOrder({
      customerName: "Walk-in customer",
      phone: phone.trim() || undefined,
      dropPoint: "Road sale",
      notes:
        [
          paid?.method === "cash" ? "Paid in cash." : null,
          paid?.method === "mpesa" ? "Paid by M-Pesa outside the system." : null,
          typedIn ? "Typed-in item. Reconcile with the catalogue later." : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      items: lines.map((line) => ({
        productId: line.product?.id,
        name: line.name.trim(),
        variant: variantOf(line),
        price: Number(line.price),
        quantity: line.quantity,
      })),
      paid,
    });
    if (!result.ok) {
      setError(result.error);
      setStep("form");
      return null;
    }
    setOrderId(result.orderId);
    return result.orderId;
  }

  async function markPaid() {
    setError(null);
    const issue = itemsProblem();
    if (issue) return setError(issue);

    setStep("sending");
    try {
      const id = await createOrder({
        method: paidMethod,
        reference: paidMethod === "mpesa" ? reference.trim() || undefined : undefined,
      });
      if (id) setStep("recorded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the order. Please try again.");
      setStep("form");
    }
  }

  function openStk() {
    setError(null);
    const issue = itemsProblem();
    if (issue) return setError(issue);
    setStkOpen(true);
  }

  async function sendStk() {
    setError(null);
    if (!phone.trim()) return setError("Enter the customer's M-Pesa number to send the prompt.");

    setStep("sending");

    // Everything below can fail in ways that throw rather than return — a
    // server action dropped mid-request, a network blip, a slow Safaricom —
    // so it all sits in one try, and the popup always leaves "sending".
    let id = orderId;
    try {
      if (!id) {
        id = await createOrder();
        if (!id) return;
      }

      const response = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, phone }),
        // The server gives Safaricom 25s; allow a little more for the round trip.
        signal: AbortSignal.timeout(40_000),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        alreadyPending?: boolean;
      };
      // The customer already has a live prompt for this order: wait on that
      // one rather than sending a second (which could charge them twice).
      if (response.status === 409 && payload.alreadyPending) {
        setStep("waiting");
        watchPayment(id);
        return;
      }
      if (!response.ok) {
        throw new Error(
          payload.hint ?? payload.error ?? `Could not send the M-Pesa prompt (HTTP ${response.status}).`
        );
      }
      setStep("waiting");
      watchPayment(id);
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      const message = timedOut
        ? "M-Pesa didn't respond in time."
        : err instanceof Error
          ? err.message
          : "Could not send the M-Pesa prompt.";
      setError(
        id
          ? `${message} The order ${id} was saved, so you can try again.`
          : `${message} Nothing was saved — please try again.`
      );
      setStep("form");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 cursor-default" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-order-title"
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-white/10 bg-zinc-900 shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <h2 id="new-order-title" className="flex-1 text-sm font-black text-white">
            New Order
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="-mr-1 rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {step === "recorded" ? (
          <StatusPanel
            step={step}
            phone={phone}
            total={total}
            orderId={orderId}
            reason={failReason}
            paidMethod={paidMethod}
            onDone={close}
            onRetry={() => {
              setFailReason(null);
              setError(null);
              setStep("form");
            }}
          />
        ) : (
          <>
            {/* Body: search, items, phone */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {!locked && (
                <ProductPicker
                  products={products}
                  onPick={addProduct}
                  onTypeIn={addTypedItem}
                  autoFocus
                  placeholder={lines.length ? "Add another product…" : "Search or pick a product…"}
                />
              )}

              {lines.length > 0 ? (
                <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-zinc-800/40">
                  {lines.map((line) => (
                    <LineRow
                      key={line.key}
                      line={line}
                      locked={locked}
                      onChange={(patch) => updateLine(line.key, patch)}
                      onRemove={() => removeLine(line.key)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-xs text-white/30">Tap the search box to pick a product.</p>
              )}

              {error && !stkOpen && (
                <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}
            </div>

            {/* Footer: total and the two actions */}
            <div className="space-y-2.5 border-t border-white/5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Total{itemCount > 0 && ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`}
                </span>
                <span className="text-xl font-black text-white">{formatKes(total)}</span>
              </div>

              {paidOpen && !locked && (
                <div className="space-y-2 rounded-xl border border-green-400/20 bg-green-400/5 p-2.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["mpesa", "cash"] as PaidMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaidMethod(method)}
                        aria-pressed={paidMethod === method}
                        className={`rounded-lg py-2.5 text-xs font-black uppercase tracking-widest transition ${
                          paidMethod === method
                            ? "bg-green-500/25 text-green-200 ring-1 ring-green-400/40"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {method === "mpesa" ? "M-Pesa" : "Cash"}
                      </button>
                    ))}
                  </div>
                  {paidMethod === "mpesa" && (
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value.toUpperCase())}
                      placeholder="M-Pesa code (optional)"
                      maxLength={20}
                      autoCapitalize="characters"
                      aria-label="M-Pesa code"
                      className={`${inputClass} font-mono uppercase`}
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openStk}
                  disabled={busy || lines.length === 0 || (paidOpen && !locked)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-base">send_to_mobile</span>
                  Send STK
                </button>
                {paidOpen ? (
                  <button
                    type="button"
                    onClick={() => void markPaid()}
                    disabled={busy || lines.length === 0}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-500 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-base">check</span>
                    {busy ? "Saving…" : "Confirm paid"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPaidOpen(true)}
                    disabled={busy || lines.length === 0 || locked}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-green-500 disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-base">task_alt</span>
                    Mark as paid
                  </button>
                )}
              </div>
              {paidOpen && !locked && (
                <button
                  type="button"
                  onClick={() => setPaidOpen(false)}
                  disabled={busy}
                  className="w-full py-1 text-[11px] font-bold text-white/40 hover:text-white"
                >
                  Not paid yet? Back to Send STK
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {stkOpen && (
        <StkWindow
          step={step}
          phone={phone}
          onPhone={setPhone}
          total={total}
          itemCount={itemCount}
          orderId={orderId}
          error={error}
          failReason={failReason}
          onSend={() => void sendStk()}
          onBack={() => {
            if (busy) return;
            // Before an order exists this just goes back to editing it;
            // after, the order is saved, so the whole popup closes.
            if (orderId) close();
            else {
              setError(null);
              setStkOpen(false);
            }
          }}
          onDone={close}
          onRetry={() => {
            setFailReason(null);
            setError(null);
            setStep("form");
          }}
        />
      )}
    </div>
  );
}

/** The Send STK prompt, stacked over the order: phone, send, then the outcome. */
function StkWindow({
  step,
  phone,
  onPhone,
  total,
  itemCount,
  orderId,
  error,
  failReason,
  onSend,
  onBack,
  onDone,
  onRetry,
}: {
  step: Step;
  phone: string;
  onPhone: (value: string) => void;
  total: number;
  itemCount: number;
  orderId: string | null;
  error: string | null;
  failReason: string | null;
  onSend: () => void;
  onBack: () => void;
  onDone: () => void;
  onRetry: () => void;
}) {
  const busy = step === "sending";
  const showStatus = step === "waiting" || step === "paid" || step === "failed";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <button type="button" aria-label="Back to the order" onClick={onBack} className="absolute inset-0 cursor-default" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stk-title"
        className="relative w-full rounded-t-2xl border border-purple-400/20 bg-zinc-900 shadow-2xl sm:max-w-sm sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="-ml-1 rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label={orderId ? "Close" : "Back to the order"}
          >
            <span className="material-symbols-outlined text-xl">{orderId ? "close" : "arrow_back"}</span>
          </button>
          <h2 id="stk-title" className="flex-1 text-sm font-black text-white">
            Send STK push
          </h2>
        </div>

        {showStatus ? (
          <StatusPanel
            step={step}
            phone={phone}
            total={total}
            orderId={orderId}
            reason={failReason}
            paidMethod="mpesa"
            onDone={onDone}
            onRetry={onRetry}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
            className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
          >
            <div className="flex items-baseline justify-between rounded-xl bg-white/5 px-3 py-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <span className="text-xl font-black text-white">{formatKes(total)}</span>
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              autoFocus
              required
              value={phone}
              onChange={(e) => onPhone(e.target.value)}
              placeholder="Customer M-Pesa number"
              disabled={orderId !== null}
              aria-label="Customer M-Pesa number"
              className={inputClass}
            />
            {error && (
              <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">send_to_mobile</span>
              {busy ? "Sending…" : orderId ? "Resend prompt" : "Send prompt"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function LineRow({
  line,
  locked,
  onChange,
  onRemove,
}: {
  line: Line;
  locked: boolean;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const product = line.product;
  const sizes = product?.sizes ?? [];
  const colors = product?.colors ?? [];
  const stock = product?.stock ?? 0;
  const short = product !== null && line.quantity > stock;

  return (
    <li className="space-y-1.5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        {product ? (
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{product.name}</p>
        ) : (
          <input
            value={line.name}
            autoFocus={!line.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Item name"
            disabled={locked}
            aria-label="Item name"
            className={`${miniInputClass} min-w-0 flex-1`}
          />
        )}
        <span className="shrink-0 text-sm font-black text-white">{formatKes(lineTotal(line))}</span>
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-white/30 hover:text-red-300"
            aria-label={`Remove ${line.name || "item"}`}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={line.price}
          onChange={(e) => onChange({ price: e.target.value })}
          placeholder="Price"
          disabled={locked}
          aria-label="Price each"
          className={`${miniInputClass} w-20`}
        />
        <span className="text-xs text-white/30">×</span>
        <div className="flex items-center rounded-lg border border-white/10 bg-zinc-800">
          <button
            type="button"
            disabled={line.quantity <= 1 || locked}
            onClick={() => onChange({ quantity: Math.max(1, line.quantity - 1) })}
            className="px-2.5 py-1.5 text-white/60 disabled:opacity-30"
            aria-label="Fewer"
          >
            <span className="material-symbols-outlined text-base">remove</span>
          </button>
          <span className="w-6 text-center text-sm font-bold text-white">{line.quantity}</span>
          <button
            type="button"
            disabled={line.quantity >= 99 || locked}
            onClick={() => onChange({ quantity: Math.min(99, line.quantity + 1) })}
            className="px-2.5 py-1.5 text-white/60 disabled:opacity-30"
            aria-label="More"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
        </div>
        {colors.length > 0 && (
          <select
            value={line.color}
            onChange={(e) => onChange({ color: e.target.value })}
            disabled={locked}
            aria-label="Colour"
            className={miniInputClass}
          >
            <option value="">Colour</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        {sizes.length > 0 && (
          <select
            value={line.size}
            onChange={(e) => onChange({ size: e.target.value })}
            disabled={locked}
            aria-label="Size"
            className={miniInputClass}
          >
            <option value="">Size</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {short && (
        <p className="text-[11px] text-amber-300/80">
          {stock <= 0 ? "Out of stock" : `Only ${stock} in stock`}. You can still save it.
        </p>
      )}
      {!product && <p className="text-[11px] text-white/30">Typed item: reconcile later, takes no stock.</p>}
    </li>
  );
}

function StatusPanel({
  step,
  phone,
  total,
  orderId,
  reason,
  paidMethod,
  onDone,
  onRetry,
}: {
  step: "waiting" | "paid" | "failed" | "recorded";
  phone: string;
  total: number;
  orderId: string | null;
  reason: string | null;
  paidMethod: PaidMethod;
  onDone: () => void;
  onRetry: () => void;
}) {
  const content = {
    waiting: {
      icon: "hourglass_top",
      color: "text-amber-300 bg-amber-400/15",
      title: "Waiting for the customer",
      body: `Prompt sent to ${phone}. Ask them to enter their M-Pesa PIN.`,
    },
    paid: {
      icon: "check_circle",
      color: "text-green-300 bg-green-400/15",
      title: "Paid",
      body: `${formatKes(total)} received. The order is confirmed.`,
    },
    recorded: {
      icon: "check_circle",
      color: "text-green-300 bg-green-400/15",
      title: "Marked as paid",
      body: `${formatKes(total)} ${paidMethod === "cash" ? "in cash" : "by M-Pesa"}. The order is confirmed and stock updated.`,
    },
    failed: {
      icon: "cancel",
      color: "text-red-300 bg-red-400/15",
      title: "Not paid",
      body: reason ?? "The payment didn't go through.",
    },
  }[step];

  return (
    <div className="space-y-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${content.color}`}>
        <span className={`material-symbols-outlined text-3xl ${step === "waiting" ? "animate-pulse" : ""}`}>
          {content.icon}
        </span>
      </div>
      <div>
        <p className="text-base font-black text-white">{content.title}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-white/50">{content.body}</p>
        {orderId && <p className="mt-3 font-mono text-[10px] text-white/25">{orderId}</p>}
      </div>
      <div className="space-y-2">
        {step === "failed" && (
          <button
            type="button"
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl bg-white/10 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15"
        >
          {step === "waiting" ? "Close. It'll update in the orders list" : "Done"}
        </button>
      </div>
    </div>
  );
}
