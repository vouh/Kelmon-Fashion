"use client";

import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { useCart } from "@/components/providers/CartProvider";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/cart";
import { formatKes } from "@/lib/products";

export default function CartPage() {
  const { lines, itemCount, subtotal, deliveryFee, total, setQuantity, removeItem, clearCart } =
    useCart();

  return (
    <AppShell activeNav="cart">
      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-8 md:py-10 max-w-5xl mx-auto w-full bg-transparent">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h1 className="font-display-lg text-xl md:text-2xl text-on-surface tracking-tight">
            My Cart {itemCount > 0 ? `(${itemCount})` : ""}
          </h1>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-sm text-primary underline underline-offset-4 hover:text-[#7a3a96] transition-colors"
            >
              Clear cart
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="py-16 text-center space-y-4 rounded-2xl bg-white dark:bg-surface border border-primary/15 p-10">
            <span className="material-symbols-outlined text-4xl text-primary/40" aria-hidden="true">
              shopping_bag
            </span>
            <p className="text-base font-medium text-on-surface">Your cart is empty</p>
            <p className="text-sm text-on-surface-variant">
              Browse campus picks and add something you love.
            </p>
            <Link
              href="/shop"
              className="inline-flex h-11 px-7 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider items-center"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 pb-28 lg:pb-12">
            <div className="flex flex-col gap-3">
              {lines.map((item) => (
                <div
                  key={`${item.productId}-${item.variant ?? "default"}`}
                  className="relative flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white dark:bg-surface border border-primary/15 shadow-[0_6px_20px_rgba(142,68,173,0.06)]"
                >
                  <Link
                    href={`/product/${item.productId}`}
                    className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[#faf6fc] dark:bg-surface-container"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="96px"
                    />
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pr-6">
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface truncate">{item.name}</h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {item.category}
                        {item.variant ? ` • ${item.variant}` : ""}
                      </p>
                      <p className="text-sm font-semibold text-[#C5A059] mt-1.5">
                        {formatKes(item.price)}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-end">
                      <div className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 border border-primary/15 px-1 py-0.5">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            setQuantity(item.productId, item.variant, item.quantity - 1)
                          }
                          className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-primary/15"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                            remove
                          </span>
                        </button>
                        <span
                          className="text-sm font-medium text-on-surface w-6 text-center"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            setQuantity(item.productId, item.variant, item.quantity + 1)
                          }
                          className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-primary/15"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                            add
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeItem(item.productId, item.variant)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center text-primary/70 hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      close
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <aside>
              <div className="rounded-2xl bg-white dark:bg-surface border border-primary/15 shadow-[0_8px_28px_rgba(142,68,173,0.08)] p-5 sticky bottom-24 lg:top-24 lg:bottom-auto">
                <h2 className="text-sm font-semibold text-on-surface mb-4">Order Summary</h2>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span className="text-on-surface font-medium">{formatKes(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Delivery</span>
                    <span className="text-on-surface font-medium">
                      {deliveryFee === 0 ? "Free" : formatKes(deliveryFee)}
                    </span>
                  </div>
                </div>

                {deliveryFee > 0 && (
                  <p className="mt-3 text-xs text-on-surface-variant">
                    Add {formatKes(FREE_DELIVERY_THRESHOLD - subtotal)} more for free UoN campus
                    delivery.
                  </p>
                )}
                {deliveryFee === 0 && (
                  <p className="mt-3 text-xs text-[#C5A059]">
                    Free delivery to UoN Main Campus unlocked.
                  </p>
                )}

                <div className="h-px w-full bg-primary/15 my-4" />

                <div className="flex justify-between items-baseline mb-5">
                  <span className="text-sm text-on-surface">Total</span>
                  <span className="text-lg font-semibold text-on-surface">{formatKes(total)}</span>
                </div>

                <Link
                  href="/checkout"
                  className="w-full h-11 rounded-full bg-primary hover:bg-[#7a3a96] transition-colors flex items-center justify-center text-white text-[11px] font-semibold uppercase tracking-[0.12em] gap-1.5"
                >
                  Proceed to Checkout
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    lock
                  </span>
                  <span className="text-[10px] uppercase tracking-wider">
                    M-Pesa &amp; pay on delivery
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </AppShell>
  );
}
