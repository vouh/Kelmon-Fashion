"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";
import StarRating from "@/components/ui/StarRating";

interface ProductCarouselProps {
  products: Product[];
  autoPlayMs?: number;
}

export default function ProductCarousel({ products, autoPlayMs = 5000 }: ProductCarouselProps) {
  const [index, setIndex] = useState(0);
  const count = products.length;

  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(next, autoPlayMs);
    return () => window.clearInterval(id);
  }, [count, next, autoPlayMs]);

  if (count === 0) return null;

  const product = products[index];

  return (
    <section className="relative w-full" aria-roledescription="carousel" aria-label="Featured products">
      <div className="relative overflow-hidden rounded-2xl bg-surface-container border border-primary/15 min-h-[420px] md:min-h-[480px]">
        {products.map((p, i) => (
          <div
            key={p.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={i !== index}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 h-full min-h-[420px] md:min-h-[480px]">
              <div className="relative aspect-[4/5] md:aspect-auto md:min-h-full bg-surface-dim">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={i === 0}
                />
                {p.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary-container text-white text-xs font-semibold uppercase tracking-wider">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="flex flex-col justify-center p-8 md:p-12 gap-4">
                <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
                  {p.category}
                </p>
                <h3 className="font-headline-lg text-headline-lg text-on-surface">{p.name}</h3>
                <StarRating rating={p.rating} reviewCount={p.reviewCount} size="md" />
                <p className="font-headline-sm text-headline-sm text-secondary">{formatKes(p.price)}</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href={`/product/${p.id}`}
                    className="inline-flex h-11 px-6 rounded-lg btn-primary text-white font-button-text text-button-text items-center gap-2"
                  >
                    View product
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                  </Link>
                  <Link
                    href="/shop"
                    className="inline-flex h-11 px-6 rounded-lg btn-secondary font-button-text text-button-text items-center"
                  >
                    Shop all
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous product"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 border border-primary/20 text-on-surface flex items-center justify-center hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next product"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 border border-primary/20 text-on-surface flex items-center justify-center hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="Carousel slides">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${p.name}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-8 bg-primary" : "w-2 bg-on-surface-variant/40 hover:bg-on-surface-variant/60"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
