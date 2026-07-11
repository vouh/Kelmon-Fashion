"use client";

import { useRef } from "react";
import type { Product } from "@/lib/products";
import ProductCard from "@/components/shop/ProductCard";

interface ProductSliderProps {
  products: Product[];
  label?: string;
}

export default function ProductSlider({ products, label }: ProductSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.75, 320);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative group/slider" aria-label={label}>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll products left"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-surface/90 border border-primary/20 text-primary shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-primary/10"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          chevron_left
        </span>
      </button>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth pb-1 -mx-margin-mobile px-margin-mobile md:-mx-0 md:px-0"
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} compact />
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll products right"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-surface/90 border border-primary/20 text-primary shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-primary/10"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          chevron_right
        </span>
      </button>
    </div>
  );
}
