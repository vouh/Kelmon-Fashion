"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";
import { useCart } from "@/components/providers/CartProvider";

interface FeatureProductCardProps {
  product: Product;
}

export default function FeatureProductCard({ product }: FeatureProductCardProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [showAdded, setShowAdded] = useState(false);

  useEffect(() => {
    if (!showAdded) return;
    const timeout = window.setTimeout(() => setShowAdded(false), 900);
    return () => window.clearTimeout(timeout);
  }, [showAdded]);

  function addToCart(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (addItem(product) > 0) setShowAdded(true);
  }

  return (
    <article
      onClick={() => router.push(`/product/${product.id}`)}
      className="group w-full cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-surface border border-primary/15 shadow-[0_8px_24px_rgba(142,68,173,0.08)] hover:bg-primary hover:border-primary hover:shadow-[0_16px_40px_rgba(142,68,173,0.28)] hover:scale-[1.04] transition-all duration-300 origin-center"
    >
      <div className="relative w-full aspect-square bg-[#faf6fc] dark:bg-surface-container overflow-hidden">
        {product.badge && (
          <span className="absolute top-3 left-3 z-20 inline-flex items-center h-6 px-2.5 rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-[0.08em] group-hover:bg-white group-hover:text-primary transition-colors">
            {product.badge}
          </span>
        )}

        <Link href={`/product/${product.id}`} className="absolute inset-0 block" tabIndex={-1}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>
      </div>

      <div className="px-3 py-3.5 text-center bg-primary/[0.06] dark:bg-primary/10 border-t border-primary/10 group-hover:bg-primary group-hover:border-primary/20 transition-colors duration-300">
        <Link href={`/product/${product.id}`}>
          <h3 className="text-[12px] md:text-[13px] font-medium text-on-surface leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="text-[13px] font-semibold text-on-surface group-hover:text-white transition-colors">
          {product.originalPrice != null && (
            <span className="text-on-surface-variant/60 group-hover:text-white/55 line-through font-normal mr-1.5 text-[11px]">
              {formatKes(product.originalPrice)}
            </span>
          )}
          <span className="text-primary group-hover:text-[#C5A059] transition-colors">
            {formatKes(product.price)}
          </span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:scale-105 hover:bg-[#7a3a96] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 group-hover:bg-white group-hover:text-primary"
            aria-label={`Add ${product.name} to cart`}
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">shopping_cart</span>
          </button>
        </div>
      </div>

      {showAdded && (
        <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-on-surface px-4 py-2 text-xs font-medium text-white shadow-lg" role="status">
          Added to cart
        </div>
      )}
    </article>
  );
}
