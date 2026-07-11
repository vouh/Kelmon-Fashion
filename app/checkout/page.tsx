"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
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
      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-lg max-w-3xl mx-auto w-full pb-32 md:pb-12">
        <Link href="/cart" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary mb-6 font-body-md text-body-md">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          Back to cart
        </Link>

        <h1 className="font-display-md text-display-md text-on-surface mb-2">Checkout</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          Campus delivery — {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>

        {isEmpty ? (
          <div className="space-y-4">
            <p className="font-body-lg text-body-lg text-on-surface-variant">Nothing to check out yet.</p>
            <Link href="/shop" className="inline-flex h-12 px-8 rounded-lg btn-primary text-white font-button-text text-button-text items-center">
              Continue shopping
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-6">
              <fieldset className="space-y-4">
                <legend className="font-title-lg text-title-lg text-on-surface mb-2">Delivery details</legend>
                <label className="block space-y-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Full name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="kelmon-input w-full h-12 px-4 rounded-lg bg-surface-container border border-white/10 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/50"
                    autoComplete="name"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Phone (M-Pesa)</span>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="kelmon-input w-full h-12 px-4 rounded-lg bg-surface-container border border-white/10 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/50"
                    autoComplete="tel"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Campus drop point</span>
                  <select
                    value={dropPoint}
                    onChange={(e) => setDropPoint(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg bg-surface-container border border-white/10 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/50"
                  >
                    {DROP_POINTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Notes (optional)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg bg-surface-container border border-white/10 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/50 resize-y"
                    placeholder="Landmark, preferred time…"
                  />
                </label>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="font-title-lg text-title-lg text-on-surface mb-2">Payment</legend>
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${payment === "mpesa" ? "border-secondary bg-secondary/10" : "border-white/10"}`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "mpesa"}
                    onChange={() => setPayment("mpesa")}
                    className="accent-[var(--theme-secondary)]"
                  />
                  <span>
                    <span className="block font-button-text text-button-text text-on-surface">M-Pesa STK Push</span>
                    <span className="block font-body-md text-body-md text-on-surface-variant">
                      Pay instantly — we’ll send a prompt to your phone.
                    </span>
                  </span>
                </label>
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${payment === "cod" ? "border-secondary bg-secondary/10" : "border-white/10"}`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "cod"}
                    onChange={() => setPayment("cod")}
                    className="accent-[var(--theme-secondary)]"
                  />
                  <span>
                    <span className="block font-button-text text-button-text text-on-surface">Pay on delivery</span>
                    <span className="block font-body-md text-body-md text-on-surface-variant">
                      Cash or M-Pesa when we meet at your drop point.
                    </span>
                  </span>
                </label>
              </fieldset>

              {error && (
                <p role="alert" className="text-error font-body-md text-body-md">
                  {error}
                </p>
              )}
              {mpesaMessage && (
                <p role="status" className="text-secondary font-body-md text-body-md">
                  {mpesaMessage}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="glass-panel p-6 rounded-xl sticky top-24 space-y-4">
                <h2 className="font-title-lg text-title-lg text-on-surface">Summary</h2>
                <ul className="space-y-3 max-h-48 overflow-y-auto">
                  {lines.map((l) => (
                    <li key={`${l.productId}-${l.variant}`} className="flex justify-between gap-2 font-body-md text-body-md">
                      <span className="text-on-surface-variant truncate">
                        {l.name} × {l.quantity}
                      </span>
                      <span className="text-on-surface shrink-0">{formatKes(l.price * l.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between font-body-md text-body-md">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span>{formatKes(subtotal)}</span>
                </div>
                <div className="flex justify-between font-body-md text-body-md">
                  <span className="text-on-surface-variant">Delivery</span>
                  <span>{deliveryFee === 0 ? "Free" : formatKes(deliveryFee)}</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-on-surface-variant">
                    Free over {formatKes(FREE_DELIVERY_THRESHOLD)} to UoN campuses.
                  </p>
                )}
                <div className="flex justify-between font-headline-sm text-lg text-on-surface pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span>{formatKes(total)}</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-lg btn-primary text-white font-button-text text-button-text disabled:opacity-60"
                >
                  {submitting ? "Processing…" : payment === "mpesa" ? "Pay with M-Pesa" : "Place order"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </AppShell>
  );
}
