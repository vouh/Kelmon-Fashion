"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatKes } from "@/components/admin/ui";
import { createDirectOrder } from "@/app/admin/actions";
import type { Product } from "@/lib/products";

type Step = "form" | "sending" | "waiting" | "paid" | "failed";

const POLL_MS = 4_000;
const GIVE_UP_MS = 150_000;

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";
const labelText = "text-[10px] font-black uppercase tracking-widest text-white/40";
const labelClass = `mb-1 block ${labelText}`;

interface RequestPaymentModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
}

export default function RequestPaymentModal({ open, onClose, products }: RequestPaymentModalProps) {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const busy = step === "sending";
  const price = Number(unitPrice);
  const total = price > 0 ? price * quantity : 0;
  const itemName = manual ? manualName.trim() : selected?.name ?? "";

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? products.filter(
          (p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
        )
      : products;
    return list.slice(0, 6);
  }, [products, query]);

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPhone("");
    setCustomerName("");
    setQuery("");
    setPickerOpen(false);
    setSelected(null);
    setManual(false);
    setManualName("");
    setUnitPrice("");
    setQuantity(1);
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
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close() only reads state that is current on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy, orderId]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  function pickProduct(product: Product) {
    setSelected(product);
    setManual(false);
    setUnitPrice(String(product.price));
    setQuery("");
    setPickerOpen(false);
  }

  function typeItInstead() {
    setManual(true);
    setManualName(selected?.name ?? query.trim());
    if (!unitPrice && selected) setUnitPrice(String(selected.price));
    setSelected(null);
    setPickerOpen(false);
  }

  function backToCatalogue() {
    setManual(false);
    setManualName("");
    setUnitPrice("");
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!itemName) return setError(manual ? "Type what they're buying." : "Pick a product, or tap the pencil to type one in.");
    if (!(price > 0)) return setError("Enter the price.");

    setStep("sending");

    // Everything below can fail in ways that throw rather than return — a
    // server action dropped mid-request, a network blip, a slow Safaricom —
    // so it all sits in one try, and the popup always leaves "sending".
    let id = orderId;
    try {
      if (!id) {
        const result = await createDirectOrder({
          customerName: customerName.trim() || "Walk-in customer",
          phone,
          dropPoint: "Road sale",
          total,
          notes: manual ? "Typed-in item. Reconcile with the catalogue later." : undefined,
          item: {
            productId: manual ? undefined : selected?.id,
            name: itemName,
            price,
            quantity,
          },
        });
        if (!result.ok) {
          setError(result.error);
          setStep("form");
          return;
        }
        id = result.orderId;
        setOrderId(id);
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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 cursor-default" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-payment-title"
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-400/20">
            <span className="material-symbols-outlined text-lg text-purple-300">send_to_mobile</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="request-payment-title" className="text-sm font-black text-white">
              Request Payment
            </h2>
            <p className="text-[10px] font-bold text-white/30">Creates an order and sends an M-Pesa prompt</p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {step === "waiting" || step === "paid" || step === "failed" ? (
          <StatusPanel
            step={step}
            phone={phone}
            total={total}
            orderId={orderId}
            reason={failReason}
            onDone={close}
            onRetry={() => {
              setFailReason(null);
              setError(null);
              setStep("form");
            }}
          />
        ) : (
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5">
                <span className="material-symbols-outlined text-base text-red-400">error</span>
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="rp-phone" className={labelClass}>
                M-Pesa phone number
              </label>
              <input
                id="rp-phone"
                required
                autoFocus
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                disabled={orderId !== null}
                className={inputClass}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className={labelText}>Product</span>
                {!orderId && (
                  <button
                    type="button"
                    onClick={manual ? backToCatalogue : typeItInstead}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-purple-300 hover:bg-purple-400/10"
                  >
                    <span className="material-symbols-outlined text-sm">{manual ? "search" : "edit"}</span>
                    {manual ? "Pick from catalogue" : "Type it in"}
                  </button>
                )}
              </div>

              {manual ? (
                <div className="space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                  <input
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="What are they buying? e.g. Product X"
                    disabled={orderId !== null}
                    className={inputClass}
                  />
                  <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-200/70">
                    <span className="material-symbols-outlined text-sm text-amber-300">schedule</span>
                    Saved with a &ldquo;reconcile&rdquo; tag so you can match it to a product later. It
                    won&apos;t take stock off.
                  </p>
                </div>
              ) : selected ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-800/60 p-2.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                    <Image src={selected.image} alt="" fill unoptimized className="object-cover" sizes="48px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{selected.name}</p>
                    <p className="text-[11px] text-white/40">
                      {formatKes(selected.price)} · {selected.stock ?? 0} in stock
                    </p>
                  </div>
                  {!orderId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        setUnitPrice("");
                        setPickerOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
                      aria-label="Change product"
                    >
                      <span className="material-symbols-outlined text-base">swap_horiz</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-white/30">
                    search
                  </span>
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPickerOpen(true);
                    }}
                    onFocus={() => setPickerOpen(true)}
                    placeholder="Search products…"
                    className={`${inputClass} pl-9`}
                  />
                  {pickerOpen && (
                    <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-zinc-800 py-1 shadow-xl">
                      {matches.length === 0 ? (
                        <li className="px-3 py-3 text-xs text-white/40">
                          No match.{" "}
                          <button type="button" onClick={typeItInstead} className="font-bold text-purple-300 hover:underline">
                            Type it in instead
                          </button>
                        </li>
                      ) : (
                        matches.map((product) => (
                          <li key={product.id}>
                            <button
                              type="button"
                              onClick={() => pickProduct(product)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
                            >
                              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-700">
                                <Image src={product.image} alt="" fill unoptimized className="object-cover" sizes="36px" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-white">{product.name}</p>
                                <p className="text-[10px] text-white/35">
                                  {product.category} · {(product.stock ?? 0) > 0 ? `${product.stock} in stock` : "sold out"}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-purple-300">{formatKes(product.price)}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label htmlFor="rp-price" className={labelClass}>
                  Price each (KES)
                </label>
                <input
                  id="rp-price"
                  required
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0"
                  disabled={orderId !== null}
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>Qty</span>
                <div className="flex h-[42px] items-center rounded-lg border border-white/10 bg-zinc-800">
                  <button
                    type="button"
                    disabled={quantity <= 1 || orderId !== null}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-2.5 text-white/50 hover:text-white disabled:opacity-30"
                    aria-label="Fewer"
                  >
                    <span className="material-symbols-outlined text-base">remove</span>
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-white">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= 99 || orderId !== null}
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="px-2.5 text-white/50 hover:text-white disabled:opacity-30"
                    aria-label="More"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="rp-name" className={labelClass}>
                Customer name <span className="normal-case tracking-normal text-white/25">(optional)</span>
              </label>
              <input
                id="rp-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in customer"
                disabled={orderId !== null}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total</span>
              <span className="text-lg font-black text-white">{formatKes(total)}</span>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">send_to_mobile</span>
              {busy ? "Sending prompt…" : orderId ? "Resend M-Pesa prompt" : "Send M-Pesa prompt"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function StatusPanel({
  step,
  phone,
  total,
  orderId,
  reason,
  onDone,
  onRetry,
}: {
  step: "waiting" | "paid" | "failed";
  phone: string;
  total: number;
  orderId: string | null;
  reason: string | null;
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
    failed: {
      icon: "cancel",
      color: "text-red-300 bg-red-400/15",
      title: "Not paid",
      body: reason ?? "The payment didn't go through.",
    },
  }[step];

  return (
    <div className="space-y-5 px-5 py-8 text-center">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15"
        >
          {step === "waiting" ? "Close. It'll update in the orders list" : "Done"}
        </button>
      </div>
    </div>
  );
}
