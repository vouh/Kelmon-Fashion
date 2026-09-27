"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";
import StarRating from "@/components/ui/StarRating";

interface ProductSliderProps {
  products: Product[];
  label?: string;
  autoPlayMs?: number;
}

export default function ProductSlider({
  products,
  label = "Products",
  autoPlayMs = 4500,
}: ProductSliderProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const count = products.length;

  const goTo = useCallback(
    (nextIndex: number, dir: "next" | "prev") => {
      if (count === 0) return;
      setDirection(dir);
      setIndex(((nextIndex % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(index + 1, "next"), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, "prev"), [goTo, index]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => {
      setDirection("next");
      setIndex((i) => (i + 1) % count);
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [count, autoPlayMs]);

  if (count === 0) return null;

  const product = products[index];

  return (
    <section className="product-slider" aria-roledescription="carousel" aria-label={label}>
      <div className="relative overflow-hidden bg-surface-container border border-primary/25 min-h-[440px] md:min-h-[480px]">
        <div
          key={product.id}
          className={`product-slider-slide grid grid-cols-1 md:grid-cols-2 min-h-[440px] md:min-h-[480px] ${
            direction === "next" ? "slide-from-right" : "slide-from-left"
          }`}
        >
          <div className="relative aspect-[4/5] md:aspect-auto md:min-h-full bg-black">
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {product.badge && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-white text-xs font-semibold uppercase tracking-wider">
                {product.badge}
              </span>
            )}
          </div>

          <div className="flex flex-col justify-center p-8 md:p-12 gap-4 bg-surface">
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
              {product.category}
            </p>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">{product.name}</h3>
            <StarRating rating={product.rating} reviewCount={product.reviewCount} size="md" />
            <p className="font-headline-sm text-headline-sm text-primary">{formatKes(product.price)}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={`/product/${product.id}`}
                className="inline-flex h-11 px-6 btn-primary text-white font-button-text text-button-text items-center gap-2"
              >
                View product
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/shop"
                className="inline-flex h-11 px-6 border border-secondary text-secondary font-button-text text-button-text items-center hover:bg-secondary/10 transition-colors"
              >
                Shop all
              </Link>
            </div>
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous product"
              className="slider-arrow absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-20"
            >
              <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next product"
              className="slider-arrow absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-20"
            >
              <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center items-center gap-3 mt-5" role="tablist" aria-label="Product slides">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${p.name}`}
              onClick={() => goTo(i, i > index ? "next" : "prev")}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-8 bg-primary" : "w-2 bg-on-surface-variant/40 hover:bg-primary/60"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
