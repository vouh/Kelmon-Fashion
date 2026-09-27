"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface FeatureProductCardProps {
  product: Product;
}

export default function FeatureProductCard({ product }: FeatureProductCardProps) {
  const stars = Math.round(product.rating);

  return (
    <article className="group w-full overflow-hidden rounded-2xl bg-white dark:bg-surface border border-primary/15 shadow-[0_8px_24px_rgba(142,68,173,0.08)] hover:bg-primary hover:border-primary hover:shadow-[0_16px_40px_rgba(142,68,173,0.28)] hover:scale-[1.04] transition-all duration-300 origin-center">
      <div className="relative w-full aspect-square bg-[#faf6fc] dark:bg-surface-container overflow-hidden">
        {product.badge && (
          <span className="absolute top-3 left-3 z-20 inline-flex items-center h-6 px-2.5 rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-[0.08em] group-hover:bg-white group-hover:text-primary transition-colors">
            {product.badge}
          </span>
        )}

        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
          <Link
            href={`/product/${product.id}`}
            className="inline-flex items-center h-7 px-3 rounded-full bg-white text-primary text-[10px] font-semibold uppercase tracking-[0.08em]"
          >
            Learn more
          </Link>
        </div>

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

        <div className="mt-1.5 flex justify-center gap-0" aria-label={`${product.rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`material-symbols-outlined text-[13px] ${
                i < stars ? "text-[#C5A059]" : "text-[#C5A059]/30 group-hover:text-white/35"
              }`}
              style={i < stars ? { fontVariationSettings: "'FILL' 1" } : undefined}
              aria-hidden="true"
            >
              star
            </span>
          ))}
        </div>

        <p className="mt-1.5 text-[13px] font-semibold text-on-surface group-hover:text-white transition-colors">
          {product.originalPrice != null && (
            <span className="text-on-surface-variant/60 group-hover:text-white/55 line-through font-normal mr-1.5 text-[11px]">
              {formatKes(product.originalPrice)}
            </span>
          )}
          <span className="text-primary group-hover:text-[#C5A059] transition-colors">
            {formatKes(product.price)}
          </span>
        </p>
      </div>
    </article>
  );
}
