"use client";

import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { useCart } from "@/components/providers/CartProvider";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/cart";
import { formatKes } from "@/lib/products";

export default function CartPage() {
  const { lines, itemCount, subtotal, deliveryFee, total, setQuantity, removeItem, clearCart } = useCart();

  return (
    <AppShell activeNav="cart">
      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-lg max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <h1 className="font-display-md text-display-md text-on-surface">
            My Cart {itemCount > 0 ? `(${itemCount})` : ""}
          </h1>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="font-body-md text-body-md text-on-surface-variant hover:text-error transition-colors underline underline-offset-4"
            >
              Clear cart
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <p className="font-headline-sm text-headline-sm text-on-surface">Your cart is empty</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Browse campus picks and add something you love.
            </p>
            <Link
              href="/shop"
              className="inline-flex h-12 px-8 rounded-lg btn-primary font-button-text text-button-text text-white items-center"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-28 lg:pb-12">
            <div className="lg:col-span-2 flex flex-col gap-4">
              {lines.map((item) => (
                <div
                  key={`${item.productId}-${item.variant ?? "default"}`}
                  className="glass-panel p-4 rounded-xl flex gap-4 sm:gap-6 items-center relative"
                >
                  <Link
                    href={`/product/${item.productId}`}
                    className="w-24 h-32 flex-shrink-0 bg-surface rounded-lg overflow-hidden relative"
                  >
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                  </Link>
                  <div className="flex-1 flex flex-col justify-between min-h-[7rem] py-1 pr-8">
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface mb-1">{item.name}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {item.category}
                        {item.variant ? ` • ${item.variant}` : ""}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-body-lg text-body-lg text-secondary font-semibold">
                        {formatKes(item.price)}
                      </span>
                      <div className="flex items-center gap-1 bg-surface-container-lowest px-1 py-1 rounded-full border border-white/10">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setQuantity(item.productId, item.variant, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-full"
                        >
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">remove</span>
                        </button>
                        <span className="font-body-md text-body-md w-6 text-center" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => setQuantity(item.productId, item.variant, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-full"
                        >
                          <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeItem(item.productId, item.variant)}
                    className="absolute top-3 right-3 text-outline hover:text-error transition-colors p-2"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="glass-panel p-6 rounded-xl sticky bottom-24 lg:top-24 lg:bottom-auto">
                <h2 className="font-title-lg text-title-lg text-on-surface mb-6">Order Summary</h2>
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">Subtotal</span>
                    <span className="font-body-md text-body-md text-on-surface">{formatKes(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">Delivery</span>
                    <span className="font-body-md text-body-md text-on-surface">
                      {deliveryFee === 0 ? "Free" : formatKes(deliveryFee)}
                    </span>
                  </div>
                </div>
                {deliveryFee > 0 && (
                  <p className="font-body-md text-xs text-on-surface-variant mb-4">
                    Add {formatKes(FREE_DELIVERY_THRESHOLD - subtotal)} more for free UoN campus delivery.
                  </p>
                )}
                {deliveryFee === 0 && (
                  <p className="font-body-md text-xs text-secondary mb-4">
                    Free delivery to UoN Main Campus unlocked.
                  </p>
                )}
                <div className="h-px w-full bg-secondary/30 my-6" />
                <div className="flex justify-between items-end mb-8">
                  <span className="font-body-lg text-body-lg text-on-surface">Total</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{formatKes(total)}</span>
                </div>
                <Link
                  href="/checkout"
                  className="w-full h-12 rounded-lg btn-primary flex items-center justify-center font-button-text text-button-text text-white gap-2"
                >
                  Proceed to Checkout
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                </Link>
                <div className="mt-4 flex items-center justify-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-[10px]">
                    M-Pesa &amp; pay on delivery
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
