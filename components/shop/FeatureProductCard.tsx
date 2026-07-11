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
    <article className="group w-full">
      {/* Image tile — sharp white square, exactly like reference */}
      <div className="relative w-full aspect-square bg-white overflow-hidden shadow-none">
        {product.badge && (
          <span className="absolute top-3.5 left-3.5 z-20 inline-flex items-center h-6 px-3 rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-[0.08em]">
            {product.badge}
          </span>
        )}

        <div className="absolute top-3.5 right-3.5 z-20 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
          <Link
            href={`/product/${product.id}`}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-[0.06em]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              visibility
            </span>
            Quick view
          </Link>
          <button
            type="button"
            aria-label="Wishlist"
            className="w-7 h-7 rounded-full bg-white text-primary flex items-center justify-center shadow-sm hover:bg-primary hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
              favorite
            </span>
          </button>
        </div>

        <Link href={`/product/${product.id}`} className="absolute inset-0 block bg-white" tabIndex={-1}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>
      </div>

      {/* Meta — centered under tile, no card chrome */}
      <div className="pt-5 text-center">
        <Link href={`/product/${product.id}`}>
          <h3 className="text-[13px] md:text-sm text-[#2a1a36] dark:text-on-surface leading-snug px-1 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex justify-center gap-0.5" aria-label={`${product.rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`material-symbols-outlined text-[15px] ${
                i < stars ? "text-primary" : "text-primary/25"
              }`}
              style={i < stars ? { fontVariationSettings: "'FILL' 1" } : undefined}
              aria-hidden="true"
            >
              star
            </span>
          ))}
        </div>

        <p className="mt-2 text-sm md:text-[15px] font-semibold text-[#2a1a36] dark:text-on-surface">
          {product.originalPrice != null && (
            <span className="text-[#9a8aa8] line-through font-normal mr-2 text-[13px]">
              {formatKes(product.originalPrice)}
            </span>
          )}
          {formatKes(product.price)}
        </p>
      </div>
    </article>
  );
}
