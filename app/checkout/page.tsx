"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModal";
import { useCart } from "@/components/providers/CartProvider";
import { MpesaPayModal, useMpesaPayment } from "@/components/payments/MpesaPayment";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/cart";
import { formatKes } from "@/lib/products";
import { KENYA_COUNTIES } from "@/lib/kenya";

/** 2547XXXXXXXX (how profiles store it) → 07XXXXXXXX, the form people type. */
function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("254") && digits.length === 12 ? `0${digits.slice(3)}` : phone;
}

const inputClass =
  "w-full h-11 px-3.5 rounded-xl bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-sm text-on-surface outline-none focus:border-primary transition-colors";

interface StockIssue {
  productId: string;
  name: string;
  available: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, deliveryFee, total, clearCart, itemCount, fitToStock } = useCart();
  const { ensureSession, user, profile, updateProfile } = useAuth();
  const { openAuth } = useAuthModal();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [dropPoint, setDropPoint] = useState("");
  const [school, setSchool] = useState("");
  const [payment, setPayment] = useState<"mpesa" | "cod">("mpesa");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server says the cart asks for more than is in stock.
  const [stockIssue, setStockIssue] = useState<StockIssue | null>(null);
  // Kept after a failed payment so "Try again" re-charges the same order
  // instead of opening a duplicate one.
  const [orderId, setOrderId] = useState<string | null>(null);
  const { state: payState, pay, reset: resetPay } = useMpesaPayment();
  const formRef = useRef<HTMLFormElement>(null);
  // Held separately because a successful payment clears the cart (and total).
  const [chargedTotal, setChargedTotal] = useState<number | null>(null);
  const paying = payState.phase === "sending" || payState.phase === "waiting";

  const isEmpty = lines.length === 0;

  // Prefill from the signed-in customer's profile once it loads. Only empty
  // fields are filled, so anything already typed is never overwritten, and it
  // runs once so clearing a field doesn't make it bounce back.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || (!profile && !user)) return;
    const fullName = profile?.full_name?.trim() || user?.displayName?.trim() || "";
    const savedPhone = profile?.phone?.trim() || user?.phoneNumber?.trim() || "";
    const savedCounty = profile?.county?.trim() ?? "";
    const savedLocation = profile?.location?.trim() ?? "";
    const savedSchool = profile?.campus?.trim() ?? "";

    if (fullName) setName((current) => current || fullName);
    if (savedPhone) setPhone((current) => current || displayPhone(savedPhone));
    if (savedCounty) setCounty((current) => current || savedCounty);
    if (savedLocation) setDropPoint((current) => current || savedLocation);
    if (savedSchool) setSchool((current) => current || savedSchool);
    // Wait for the profile row itself before locking in, since `user` usually
    // arrives first with less detail.
    if (profile) prefilled.current = true;
  }, [profile, user]);

  const phoneValid = useMemo(() => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 12;
  }, [phone]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStockIssue(null);
    resetPay();

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
    if (!county) {
      setError("Choose your county.");
      return;
    }

    setSubmitting(true);

    try {
      // Refresh the server's cookie first, so an hour-old tab doesn't get a 401
      // from someone who is plainly still signed in.
      if (!(await ensureSession())) {
        openAuth({ message: "Sign in or create an account to place your order." });
        return;
      }

      let id = orderId;
      if (!id) {
        const orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            county,
            dropPoint: dropPoint.trim(),
            campus: school.trim() || undefined,
            payment,
            notes: notes.trim(),
            lines,
            subtotal,
            deliveryFee,
            total,
          }),
        });

        if (orderRes.status === 401) {
          openAuth({ message: "Your session expired. Sign in again to place your order." });
          return;
        }

        const orderData = (await orderRes.json()) as {
          orderId?: string;
          error?: string;
          stockIssue?: StockIssue;
        };
        if (orderData.stockIssue) setStockIssue(orderData.stockIssue);
        if (!orderRes.ok || !orderData.orderId) {
          throw new Error(orderData.error ?? "Could not create order");
        }
        id = orderData.orderId;
        setOrderId(id);

        // Remember where they are for next time: fill any empty profile
        // details from this order. Never overwrites what's already saved.
        const patch: Parameters<typeof updateProfile>[0] = {};
        if (!profile?.county?.trim() && county) patch.county = county;
        if (!profile?.location?.trim() && dropPoint.trim()) patch.location = dropPoint.trim();
        if (!profile?.campus?.trim() && school.trim()) patch.campus = school.trim();
        if (!profile?.phone?.trim() && phone.trim()) patch.phone = phone.trim();
        if (Object.keys(patch).length) void updateProfile(patch).catch(() => {});
      }

      if (payment === "mpesa") {
        // The amount is read from the order row server-side, so it isn't sent.
        // Only a confirmed payment clears the cart; on failure the customer
        // stays here with the reason and can try again.
        setChargedTotal(total);
        const outcome = await pay(id, phone.trim());
        if (outcome === "failed") {
          setSubmitting(false);
          return;
        }
        if (outcome === "timeout") {
          // The cart is cleared when they follow the link to their orders;
          // clearing it here would swap this message for the empty-cart view.
          setSubmitting(false);
          return;
        }
        if (outcome === "cancelled") return;
      }

      clearCart();
      router.push(`/orders?placed=${encodeURIComponent(id)}`);
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
          Delivery — {itemCount} item{itemCount === 1 ? "" : "s"}
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
            ref={formRef}
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
                  <span className="text-xs text-on-surface-variant">County</span>
                  <select
                    required
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose your county…</option>
                    {KENYA_COUNTIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-on-surface-variant">Location / drop point</span>
                  <input
                    required
                    value={dropPoint}
                    onChange={(e) => setDropPoint(e.target.value)}
                    placeholder="Town, estate, hostel or pickup point"
                    className={inputClass}
                    autoComplete="address-level2"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-on-surface-variant">School (optional)</span>
                  <input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. University of Nairobi"
                    className={inputClass}
                  />
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
                <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-error">
                  <p>{error}</p>
                  {stockIssue && (
                    <button
                      type="button"
                      onClick={() => {
                        fitToStock(stockIssue.productId, stockIssue.available);
                        setStockIssue(null);
                        setError(null);
                      }}
                      className="h-9 px-4 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-[#7a3a96]"
                    >
                      {stockIssue.available > 0
                        ? `Change to ${stockIssue.available} and continue`
                        : "Remove it from my cart"}
                    </button>
                  )}
                </div>
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
                      Free over {formatKes(FREE_DELIVERY_THRESHOLD)}.
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-primary/10">
                  <span className="text-sm text-on-surface">Total</span>
                  <span className="text-lg font-semibold text-on-surface">{formatKes(total)}</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || paying || payState.phase === "timeout"}
                  className="w-full h-11 rounded-full bg-primary hover:bg-[#7a3a96] text-white text-[11px] font-semibold uppercase tracking-[0.12em] disabled:opacity-60 transition-colors"
                >
                  {paying
                    ? "Waiting for M-Pesa…"
                    : submitting
                      ? "Processing…"
                      : payState.phase === "failed"
                        ? "Try again"
                        : payment === "mpesa"
                          ? "Pay with M-Pesa"
                          : "Place order"}
                </button>
              </div>
            </aside>
          </form>
        )}
      </main>
      <MpesaPayModal
        state={payState}
        amount={chargedTotal ?? undefined}
        phone={phone.trim()}
        onClose={resetPay}
        onRetry={() => formRef.current?.requestSubmit()}
        onOrdersClick={clearCart}
      />
    </AppShell>
  );
}
