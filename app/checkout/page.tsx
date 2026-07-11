"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useCart } from "@/components/providers/CartProvider";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/cart";
import { formatKes } from "@/lib/products";
import type { OrderRecord } from "@/lib/orders";

const DROP_POINTS = [
  "UoN Main Campus — Gate A",
  "UoN Main Campus — Library plaza",
  "UoN Kikuyu Campus",
  "UoN Chiromo Campus",
];

const inputClass =
  "w-full h-11 px-3.5 rounded-xl bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, deliveryFee, total, clearCart, itemCount } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dropPoint, setDropPoint] = useState(DROP_POINTS[0]);
  const [payment, setPayment] = useState<"mpesa" | "cod">("mpesa");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpesaMessage, setMpesaMessage] = useState<string | null>(null);

  const isEmpty = lines.length === 0;

  const phoneValid = useMemo(() => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 12;
  }, [phone]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMpesaMessage(null);

    if (isEmpty) {
      setError("Your cart is empty.");
      return;
    }
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!phoneValid) {
      setError("Enter a valid Kenyan phone number for M-Pesa / delivery.");
      return;
    }

    setSubmitting(true);

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          dropPoint,
          payment,
          notes: notes.trim(),
          lines,
          subtotal,
          deliveryFee,
          total,
        }),
      });

      const orderData = (await orderRes.json()) as { order?: OrderRecord; error?: string };
      if (!orderRes.ok || !orderData.order) {
        throw new Error(orderData.error ?? "Could not create order");
      }

      const order = orderData.order;

      if (payment === "mpesa") {
        const stkRes = await fetch("/api/mpesa/stk-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            phone: phone.trim(),
            amount: total,
          }),
        });

        const stkData = (await stkRes.json()) as { message?: string; error?: string };

        if (!stkRes.ok) {
          throw new Error(stkData.error ?? "M-Pesa STK push failed");
        }

        setMpesaMessage(stkData.message ?? "Check your phone for the M-Pesa prompt.");
      }

      try {
        const prev = localStorage.getItem("kelmon-orders");
        const list = prev ? (JSON.parse(prev) as OrderRecord[]) : [];
        localStorage.setItem("kelmon-orders", JSON.stringify([order, ...list].slice(0, 20)));
      } catch {
        /* ignore */
      }

      clearCart();
      router.push(`/orders?placed=${encodeURIComponent(order.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  };

  return (
    <AppShell activeNav="cart" hideBottomNav>
      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-8 md:py-10 max-w-5xl mx-auto w-full pb-28 md:pb-12">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-5"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_back
          </span>
          Back to cart
        </Link>

        <h1 className="font-display-lg text-xl md:text-2xl text-on-surface tracking-tight mb-1">
          Checkout
        </h1>
        <p className="text-sm text-on-surface-variant mb-7">
          Campus delivery — {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>

        {isEmpty ? (
          <div className="rounded-2xl bg-white dark:bg-surface border border-primary/15 p-10 text-center space-y-4">
            <p className="text-sm text-on-surface-variant">Nothing to check out yet.</p>
            <Link
              href="/shop"
              className="inline-flex h-11 px-7 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider items-center"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8"
          >
            <div className="space-y-4">
              <fieldset className="rounded-2xl bg-white dark:bg-surface border border-primary/15 p-5 space-y-4 shadow-[0_6px_20px_rgba(142,68,173,0.06)]">
                <legend className="text-sm font-semibold text-on-surface px-1">
                  Delivery details
                </legend>
                <label className="block space-y-1.5">
                  <span className="text-xs text-on-surface-variant">Full name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    autoComplete="name"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-on-surface-variant">Phone (M-Pesa)</span>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    autoComplete="tel"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-on-surface-variant">Campus drop point</span>
                  <select
                    value={dropPoint}
                    onChange={(e) => setDropPoint(e.target.value)}
                    className={inputClass}
                  >
                    {DROP_POINTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-on-surface-variant">Notes (optional)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={`${inputClass} h-auto py-2.5 resize-y`}
                    placeholder="Landmark, preferred time…"
                  />
                </label>
              </fieldset>

              <fieldset className="rounded-2xl bg-white dark:bg-surface border border-primary/15 p-5 space-y-3 shadow-[0_6px_20px_rgba(142,68,173,0.06)]">
                <legend className="text-sm font-semibold text-on-surface px-1">Payment</legend>
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    payment === "mpesa"
                      ? "border-primary bg-primary/5"
                      : "border-primary/10 hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "mpesa"}
                    onChange={() => setPayment("mpesa")}
                    className="mt-0.5 accent-[#8E44AD]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-surface">M-Pesa STK Push</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">
                      Pay instantly — we&apos;ll send a prompt to your phone.
                    </span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    payment === "cod"
                      ? "border-primary bg-primary/5"
                      : "border-primary/10 hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "cod"}
                    onChange={() => setPayment("cod")}
                    className="mt-0.5 accent-[#8E44AD]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-on-surface">Pay on delivery</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">
                      Cash or M-Pesa when we meet at your drop point.
                    </span>
                  </span>
                </label>
              </fieldset>

              {error && (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              )}
              {mpesaMessage && (
                <p role="status" className="text-sm text-[#C5A059]">
                  {mpesaMessage}
                </p>
              )}
            </div>

            <aside>
              <div className="rounded-2xl bg-white dark:bg-surface border border-primary/15 p-5 sticky top-24 space-y-4 shadow-[0_8px_28px_rgba(142,68,173,0.08)]">
                <h2 className="text-sm font-semibold text-on-surface">Summary</h2>
                <ul className="space-y-3 max-h-52 overflow-y-auto">
                  {lines.map((l) => (
                    <li
                      key={`${l.productId}-${l.variant}`}
                      className="flex gap-2.5 items-center"
                    >
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-[#faf6fc] dark:bg-surface-container shrink-0">
                        <Image
                          src={l.image}
                          alt={l.name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-on-surface truncate">{l.name}</p>
                        <p className="text-[11px] text-on-surface-variant">× {l.quantity}</p>
                      </div>
                      <span className="text-xs font-medium text-on-surface shrink-0">
                        {formatKes(l.price * l.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 text-sm pt-1 border-t border-primary/10">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span className="font-medium">{formatKes(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Delivery</span>
                    <span className="font-medium">
                      {deliveryFee === 0 ? "Free" : formatKes(deliveryFee)}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-[11px] text-on-surface-variant">
                      Free over {formatKes(FREE_DELIVERY_THRESHOLD)} to UoN campuses.
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-primary/10">
                  <span className="text-sm text-on-surface">Total</span>
                  <span className="text-lg font-semibold text-on-surface">{formatKes(total)}</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-full bg-primary hover:bg-[#7a3a96] text-white text-[11px] font-semibold uppercase tracking-[0.12em] disabled:opacity-60 transition-colors"
                >
                  {submitting
                    ? "Processing…"
                    : payment === "mpesa"
                      ? "Pay with M-Pesa"
                      : "Place order"}
                </button>
              </div>
            </aside>
          </form>
        )}
      </main>
    </AppShell>
  );
}
