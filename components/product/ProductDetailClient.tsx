"use client";

import { useState } from "react";
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
      <main className="w-full max-w-[1200px] mx-auto p-margin-mobile md:p-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-xl pb-36 md:pb-12">
        <section className="md:col-span-6 lg:col-span-7 flex flex-col gap-sm">
          <div className="relative w-full aspect-[4/5] bg-surface-container rounded-xl overflow-hidden hairline-gold">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        </section>

        <section className="md:col-span-6 lg:col-span-5 flex flex-col">
          <div className="mb-lg">
            <div className="flex justify-between items-start mb-2 gap-3">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{product.name}</h1>
              <button
                type="button"
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-pressed={wishlisted}
                onClick={() => setWishlisted((w) => !w)}
                className="text-on-surface-variant hover:text-secondary transition-colors p-2 shrink-0"
              >
                <span
                  className="material-symbols-outlined"
                  style={wishlisted ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  aria-hidden="true"
                >
                  {wishlisted ? "favorite" : "favorite_border"}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="font-headline-sm text-headline-sm text-secondary">{formatKes(product.price)}</div>
              <StarRating rating={product.rating} reviewCount={product.reviewCount} />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-[var(--kelmon-success)]/40">
              <span className="w-2 h-2 rounded-full bg-[var(--kelmon-success)]" aria-hidden="true" />
              <span className="font-label-caps text-label-caps text-[var(--kelmon-success)] uppercase">In stock</span>
            </div>
            <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
              Curated campus glam. Free UoN delivery on orders over {formatKes(3000)}.
            </p>
          </div>

          {variantConfig && (
            <div className="mb-lg">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-4">{variantConfig.label}</h3>
              <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={variantConfig.label}>
                {variantConfig.options.map((option) => {
                  const selected = selectedVariant === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedVariant(option)}
                      className={`min-h-12 px-6 py-3 rounded-lg font-button-text text-button-text transition-colors ${
                        selected
                          ? "bg-primary-container/20 border border-primary text-primary"
                          : "bg-surface-container border border-white/10 text-on-surface-variant hover:border-white/30"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-white/10 pt-4 mb-xl">
            <details open className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none font-title-lg text-title-lg text-on-surface py-2">
                Product Details
                <span className="material-symbols-outlined transform group-open:rotate-180 transition-transform text-on-surface-variant" aria-hidden="true">
                  expand_more
                </span>
              </summary>
              <div className="mt-4 font-body-lg text-body-lg text-on-surface-variant space-y-4">
                <p>
                  Premium {product.category.toLowerCase()} pick for campus — priced in KES, delivered to
                  your drop point.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Category: {product.category}</li>
                  {selectedVariant && <li>{variantConfig?.label}: {selectedVariant}</li>}
                  <li>Authenticity: campus marketplace listing — ask support if you need batch details</li>
                </ul>
              </div>
            </details>
          </div>

          <div className="mt-auto hidden md:flex flex-col gap-3 bg-surface-container p-6 rounded-xl hairline-gold">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-surface-dim rounded-lg border border-white/10 h-12">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-12 h-full flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">remove</span>
                </button>
                <span className="w-8 text-center font-button-text text-button-text" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-12 h-full flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">add</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 h-12 rounded-lg btn-primary font-button-text text-button-text text-white flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">shopping_bag</span>
                Add to Cart
              </button>
            </div>
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full h-12 rounded-lg btn-secondary font-button-text text-button-text"
            >
              Buy Now
            </button>
          </div>
        </section>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 glass-panel px-4 py-3 flex flex-col gap-3 border-t border-[var(--kelmon-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-container rounded-lg border border-white/10 h-12 shrink-0">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-full flex items-center justify-center text-on-surface-variant"
            >
              <span className="material-symbols-outlined" aria-hidden="true">remove</span>
            </button>
            <span className="w-6 text-center font-button-text text-button-text">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-full flex items-center justify-center text-on-surface-variant"
            >
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 h-12 rounded-lg btn-primary font-button-text text-button-text text-white"
          >
            Add to Cart
          </button>
        </div>
        <button
          type="button"
          onClick={handleBuyNow}
          className="w-full h-12 rounded-lg btn-secondary font-button-text text-button-text"
        >
          Buy Now
        </button>
      </div>
    </AppShell>
  );
}
