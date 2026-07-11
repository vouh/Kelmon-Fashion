"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import StarRating from "@/components/ui/StarRating";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/ui/Toast";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";
import { getVariantOptions } from "@/lib/cart";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { toast } = useToast();
  const variantConfig = getVariantOptions(product.category);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(variantConfig?.options[0]);
  const [wishlisted, setWishlisted] = useState(false);

  const handleAdd = () => {
    addItem(product, quantity, selectedVariant);
    toast(`Added ${product.name} to cart`);
  };

  const handleBuyNow = () => {
    addItem(product, quantity, selectedVariant);
    router.push("/checkout");
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
          <div className="relative w-full max-w-md mx-auto md:mx-0 aspect-square rounded-2xl overflow-hidden bg-white dark:bg-surface-container border border-primary/15 shadow-[0_8px_28px_rgba(142,68,173,0.08)]">
            {product.badge && (
              <span className="absolute top-3 left-3 z-10 h-6 px-2.5 inline-flex items-center rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-wider">
                {product.badge}
              </span>
            )}
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 90vw, 420px"
              priority
            />
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
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-pressed={wishlisted}
                onClick={() => setWishlisted((w) => !w)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={wishlisted ? { fontVariationSettings: "'FILL' 1" } : undefined}
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
              <StarRating rating={product.rating} reviewCount={product.reviewCount} />
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
              Free delivery on orders over {formatKes(3000)}.
            </p>

            {variantConfig && (
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  {variantConfig.label}
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={variantConfig.label}>
                  {variantConfig.options.map((option) => {
                    const selected = selectedVariant === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedVariant(option)}
                        className={`h-9 px-4 rounded-full text-xs font-medium transition-colors ${
                          selected
                            ? "bg-primary text-white"
                            : "bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-on-surface-variant hover:border-primary"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-primary/[0.06] dark:bg-primary/10 border border-primary/10 p-3.5 mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5">
                Details
              </p>
              <ul className="text-sm text-on-surface-variant space-y-1">
                <li>Category: {product.category}</li>
                {selectedVariant && (
                  <li>
                    {variantConfig?.label}: {selectedVariant}
                  </li>
                )}
                <li>In stock · Fast delivery available</li>
              </ul>
            </div>

            {/* Desktop actions */}
            <div className="hidden md:flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="inline-flex items-center rounded-full bg-[#faf6fc] dark:bg-surface-container border border-primary/15 h-10 px-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-primary/10"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      remove
                    </span>
                  </button>
                  <span className="w-7 text-center text-sm font-medium" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 flex items-center justify-center text-primary rounded-full hover:bg-primary/10"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      add
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 h-10 rounded-full bg-primary hover:bg-[#7a3a96] text-white text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"
                >
                  Add to cart
                </button>
              </div>
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full h-10 rounded-full border border-primary text-primary text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-primary/10 transition-colors"
              >
                Buy now
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-white/95 dark:bg-[#1a0f22]/95 backdrop-blur-xl border-t border-primary/15 flex items-center gap-2.5">
        <div className="inline-flex items-center rounded-full bg-[#faf6fc] dark:bg-surface-container border border-primary/15 h-10 px-1 shrink-0">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center text-primary"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              remove
            </span>
          </button>
          <span className="w-6 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-8 h-8 flex items-center justify-center text-primary"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 h-10 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider"
        >
          Add to cart
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="h-10 px-4 rounded-full border border-primary text-primary text-[11px] font-semibold uppercase tracking-wider shrink-0"
        >
          Buy
        </button>
      </div>
    </AppShell>
  );
}
