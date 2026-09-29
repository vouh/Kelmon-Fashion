"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import StarRating from "@/components/ui/StarRating";
import { useCart } from "@/components/providers/CartProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModal";
import { useToast } from "@/components/ui/Toast";
import { useProductLike } from "@/components/product/useProductLike";
import { MpesaPayModal, useMpesaPayment } from "@/components/payments/MpesaPayment";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";
import { quantityOfProduct } from "@/lib/cart";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addItem, lines } = useCart();
  const { ensureSession, user } = useAuth();
  const { openAuth } = useAuthModal();
  const { toast } = useToast();

  // Only what the admin set on the product; no colours or sizes means no picker.
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const colorImages = product.colorImages ?? {};
  const gallery = Array.from(
    new Set([...(product.images?.length ? product.images : [product.image]), ...Object.values(colorImages)])
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colors[0]);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(sizes[0]);
  const [shownImage, setShownImage] = useState(
    (colors[0] && colorImages[colors[0]]) || product.image
  );
  const selectedVariant = [selectedColor, selectedSize].filter(Boolean).join(" / ") || undefined;

  const pickColor = (color: string) => {
    setSelectedColor(color);
    if (colorImages[color]) setShownImage(colorImages[color]);
  };
  const { liked, toggle: toggleLike } = useProductLike(product.id);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [buyPhone, setBuyPhone] = useState("");
  const [buyError, setBuyError] = useState<string | null>(null);
  // The order from the first attempt, reused when the customer retries after a
  // failed payment (wrong PIN, cancelled…) so retries don't create duplicates.
  const [buyOrder, setBuyOrder] = useState<{ id: string; qty: number; variant?: string } | null>(null);
  const { state: paymentState, pay, reset: resetPayment } = useMpesaPayment();
  const buying = paymentState.phase === "sending" || paymentState.phase === "waiting";
  const buyFormRef = useRef<HTMLFormElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActionsVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const stock = product.stock ?? 0;
  const soldOut = stock <= 0;
  // What this customer can still add: stock minus what's already in their
  // cart (all sizes/colours share one stock).
  const inCart = quantityOfProduct(lines, product.id);
  const available = Math.max(stock - inCart, 0);
  const allInCart = !soldOut && available === 0;
  // Clamped for display and use, so the number never exceeds what's left.
  const qty = Math.max(1, Math.min(quantity, available || 1));
  const canIncrease = qty < available;
  const canDecrease = qty > 1;

  const handleAdd = () => {
    if (soldOut || allInCart) return;
    const colorImage = selectedColor ? colorImages[selectedColor] : undefined;
    const added = addItem(
      colorImage ? { ...product, image: colorImage } : product,
      qty,
      selectedVariant
    );
    setQuantity(1);
    if (added === 0) toast(`You already have all ${stock} in your cart`);
    else if (added < qty) toast(`Only ${stock} in stock — added ${added} to your cart`);
    else toast(`Added ${product.name} to cart`);
  };

  const handleBuyNow = () => {
    if (soldOut) return;
    setBuyError(null);
    resetPayment();
    setBuyNowOpen(true);
  };

  const submitBuyNow = async (event: React.FormEvent) => {
    event.preventDefault();
    setBuyError(null);
    if (!(await ensureSession())) {
      openAuth({ message: "Sign in or create an account to pay with M-Pesa." });
      return;
    }
    try {
      // Same item, quantity and options as last time: charge that order again.
      let orderId =
        buyOrder && buyOrder.qty === qty && buyOrder.variant === selectedVariant ? buyOrder.id : null;
      if (!orderId) {
        const response = await fetch("/api/buy-now", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, quantity: qty, variant: selectedVariant, phone: buyPhone }),
        });
        const data = (await response.json().catch(() => ({}))) as { orderId?: string; error?: string };
        if (response.status === 401) {
          openAuth({ message: "Your session expired. Sign in again to pay." });
          return;
        }
        if (!response.ok || !data.orderId) throw new Error(data.error ?? "Could not create payment.");
        orderId = data.orderId;
        setBuyOrder({ id: orderId, qty, variant: selectedVariant });
      }
      const outcome = await pay(orderId, buyPhone);
      if (outcome === "paid") {
        setBuyOrder(null);
        router.push(`/orders?placed=${encodeURIComponent(orderId)}`);
      }
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Could not start payment.");
    }
  };

  return (
    <AppShell activeNav="shop" hideBottomNav>
      <main className="w-full max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-6 md:py-8 pb-28 md:pb-12">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-5"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_back
          </span>
          Back to shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
          {/* Image — square, not tall */}
          <div className="w-full max-w-md mx-auto md:mx-0">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-white dark:bg-surface-container border border-primary/15 shadow-[0_8px_28px_rgba(142,68,173,0.08)]">
              {product.badge && (
                <span className="absolute top-3 left-3 z-10 h-6 px-2.5 inline-flex items-center rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-wider">
                  {product.badge}
                </span>
              )}
              <Image
                key={shownImage}
                src={shownImage}
                alt={selectedColor ? `${product.name} in ${selectedColor}` : product.name}
                fill
                unoptimized
                className="object-cover animate-[search-backdrop-in_0.25s_ease-out]"
                sizes="(max-width: 768px) 90vw, 420px"
                priority
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {gallery.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setShownImage(url)}
                    aria-label="Show this photo"
                    aria-pressed={shownImage === url}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                      shownImage === url ? "border-primary" : "border-transparent hover:border-primary/40"
                    }`}
                  >
                    <Image src={url} alt="" fill unoptimized className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details — compact readable type */}
          <div className="rounded-2xl bg-white dark:bg-surface border border-primary/15 p-5 md:p-6 shadow-[0_8px_28px_rgba(142,68,173,0.06)]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1">
                  {product.category}
                </p>
                <h1 className="text-lg md:text-xl font-semibold text-on-surface leading-snug">
                  {product.name}
                </h1>
              </div>
              <button
                type="button"
                aria-label={liked ? "Unlike" : "Like"}
                aria-pressed={liked}
                title={liked ? "You like this" : "Like"}
                onClick={() => {
                  if (user && !liked) toast("Liked. We'll show you more like this.");
                  void toggleLike();
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0 active:scale-90"
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-transform ${liked ? "scale-110" : ""}`}
                  style={liked ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  aria-hidden="true"
                >
                  favorite
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <p className="text-xl font-semibold text-[#C5A059]">{formatKes(product.price)}</p>
              {product.originalPrice != null && (
                <p className="text-sm text-on-surface-variant line-through">
                  {formatKes(product.originalPrice)}
                </p>
              )}
            </div>

            <div className="mb-4">
              <StarRating reviewCount={product.reviewCount} />
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
              Free delivery on orders over {formatKes(3000)}.
            </p>

            {colors.length > 0 && (
              <OptionPicker
                label="Colour"
                options={colors}
                selected={selectedColor}
                onSelect={pickColor}
                images={colorImages}
              />
            )}
            {sizes.length > 0 && (
              <OptionPicker label="Size" options={sizes} selected={selectedSize} onSelect={setSelectedSize} />
            )}

            <div className="rounded-xl bg-primary/[0.06] dark:bg-primary/10 border border-primary/10 p-3.5 mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5">
                Details
              </p>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>Category: {product.category}</li>
                {selectedColor && <li>Colour: {selectedColor}</li>}
                {selectedSize && <li>Size: {selectedSize}</li>}
                <li>
                  {soldOut
                    ? "Sold out"
                    : stock <= 5
                      ? `Only ${stock} left · Fast delivery available`
                      : "In stock · Fast delivery available"}
                </li>
                {inCart > 0 && !soldOut && (
                  <li>
                    {allInCart
                      ? `You have all ${stock} in your cart`
                      : `${inCart} in your cart · you can add ${available} more`}
                  </li>
                )}
              </ul>
            </div>

            <div ref={actionsRef} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="inline-flex items-center rounded-full bg-[#faf6fc] dark:bg-surface-container border border-primary/15 h-10 px-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(Math.max(1, qty - 1))}
                    disabled={!canDecrease}
                    className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      remove
                    </span>
                  </button>
                  <span className="w-7 text-center text-sm font-medium" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => canIncrease && setQuantity(qty + 1)}
                    disabled={!canIncrease}
                    title={canIncrease ? undefined : `Only ${available} available`}
                    className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      add
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={soldOut || allInCart}
                  className="disabled:opacity-50 flex-1 h-10 rounded-full bg-primary hover:bg-[#7a3a96] text-white text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"
                >
                  {soldOut ? "Sold out" : allInCart ? "All in your cart" : "Add to cart"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={soldOut}
                className="disabled:opacity-50 w-full h-10 rounded-full border border-primary text-primary text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-primary/10 transition-colors"
              >
                Buy now
              </button>
            </div>
          </div>
        </div>
      </main>

      {buyNowOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="buy-now-title">
          <button type="button" className="absolute inset-0" aria-label="Close payment" onClick={() => setBuyNowOpen(false)} />
          <form ref={buyFormRef} onSubmit={submitBuyNow} className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-surface">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">M-Pesa payment</p>
                <h2 id="buy-now-title" className="mt-1 text-lg font-semibold text-on-surface">Pay for {product.name}</h2>
              </div>
              <button type="button" onClick={() => setBuyNowOpen(false)} className="text-on-surface-variant hover:text-primary" aria-label="Close payment">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">Enter the number that should receive the STK prompt.</p>
            <label className="mt-4 block text-xs text-on-surface-variant">
              M-Pesa phone number
              <input required type="tel" inputMode="tel" placeholder="07XX XXX XXX" value={buyPhone} onChange={(e) => setBuyPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-primary/15 bg-[#faf6fc] px-3.5 py-3 text-sm text-on-surface outline-none focus:border-primary dark:bg-surface-container" />
            </label>
            {buyError && (
              <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-3 text-sm text-on-surface">
                {buyError}
              </p>
            )}
            <button type="submit" disabled={buying || paymentState.phase === "paid"} className="mt-5 h-11 w-full rounded-full bg-primary text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-[#7a3a96] disabled:opacity-60">
              {buying
                ? "Waiting for M-Pesa…"
                : paymentState.phase === "failed"
                  ? "Try again"
                  : paymentState.phase === "paid"
                    ? "Paid ✓"
                    : "Send M-Pesa prompt"}
            </button>
          </form>
        </div>
      )}
      <MpesaPayModal
        state={paymentState}
        amount={product.price * qty}
        phone={buyPhone.trim()}
        onClose={resetPayment}
        onRetry={() => buyFormRef.current?.requestSubmit()}
      />

      {/* Mobile sticky bar, tucked away while the in-card buttons are on screen */}
      <div
        aria-hidden={actionsVisible}
        inert={actionsVisible}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-white/95 dark:bg-surface/95 backdrop-blur-xl border-t border-primary/15 flex items-center gap-2.5 transition-transform duration-300 ${
          actionsVisible ? "translate-y-full" : ""
        }`}
      >
        <div className="inline-flex items-center rounded-full bg-[#faf6fc] dark:bg-surface-container border border-primary/15 h-10 px-1 shrink-0">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity(Math.max(1, qty - 1))}
                    disabled={!canDecrease}
            className="w-8 h-8 flex items-center justify-center text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              remove
            </span>
          </button>
          <span className="w-6 text-center text-sm font-medium">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => canIncrease && setQuantity(qty + 1)}
                    disabled={!canIncrease}
                    title={canIncrease ? undefined : `Only ${available} available`}
            className="w-8 h-8 flex items-center justify-center text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut || allInCart}
          className="disabled:opacity-50 flex-1 h-10 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider"
        >
          {soldOut ? "Sold out" : allInCart ? "All in your cart" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={soldOut}
          className="disabled:opacity-50 h-10 px-4 rounded-full border border-primary text-primary text-[11px] font-semibold uppercase tracking-wider shrink-0"
        >
          Buy now
        </button>
      </div>
    </AppShell>
  );
}

function OptionPicker({
  label,
  options,
  selected,
  onSelect,
  images,
}: {
  label: string;
  options: string[];
  selected: string | undefined;
  onSelect: (option: string) => void;
  /** Option → photo; options with one get a small swatch. */
  images?: Record<string, string>;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
        {label}
        {selected && <span className="ml-1.5 normal-case tracking-normal text-on-surface">· {selected}</span>}
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const isSelected = selected === option;
          const swatch = images?.[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option)}
              className={`h-9 inline-flex items-center gap-2 rounded-full text-xs font-medium transition-colors ${
                swatch ? "pl-1 pr-4" : "px-4"
              } ${
                isSelected
                  ? "bg-primary text-white"
                  : "bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-on-surface-variant hover:border-primary"
              }`}
            >
              {swatch && (
                <span className="relative h-7 w-7 overflow-hidden rounded-full border border-white/60">
                  <Image src={swatch} alt="" fill unoptimized className="object-cover" sizes="28px" />
                </span>
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
