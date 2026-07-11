"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface HeroShowcaseProps {
  products: Product[];
  headline?: string;
  description?: string;
  autoPlayMs?: number;
}

export default function HeroShowcase({
  products,
  headline = "Glam Of Campus",
  description = "Designer bags, signature scents, nails, and fashion — curated for UoN and delivered to your hostel door.",
  autoPlayMs = 5000,
}: HeroShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = products.length;

  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), autoPlayMs);
    return () => window.clearInterval(id);
  }, [count, paused, autoPlayMs]);

  if (count === 0) return null;

  const product = products[index];

  return (
    <section
      className="relative overflow-hidden bg-surface-dim"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="px-margin-mobile md:px-margin-desktop py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(260px,420px)_1fr] gap-8 lg:gap-6 items-center min-h-[70vh]">
          {/* Left copy */}
          <div className="space-y-5 order-2 lg:order-1 max-w-md">
            <p className="font-label-caps text-label-caps text-primary uppercase tracking-[0.2em]">
              Beauty · Fashion · Glamour
            </p>
            <h1 className="font-display-lg text-display-md md:text-display-lg text-on-surface leading-tight">
              {headline}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">{description}</p>
            <Link
              href={`/product/${product.id}`}
              className="inline-flex h-12 px-8 rounded-full btn-primary text-white font-button-text text-button-text items-center gap-2"
            >
              Buy now
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Center arched product */}
          <div className="relative order-1 lg:order-2 flex flex-col items-center">
            <div className="relative w-full max-w-[340px] mx-auto">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous product"
                className="absolute -left-3 md:-left-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#7a3a96] transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                  chevron_left
                </span>
              </button>

              <div
                key={product.id}
                className="hero-arch relative aspect-[3/4] overflow-hidden bg-surface-container border-2 border-primary/20 landing-fade"
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 80vw, 340px"
                />
              </div>

              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next product"
                className="absolute -right-3 md:-right-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#7a3a96] transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>

            <div className="flex gap-2 mt-5" role="tablist" aria-label="Hero products">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={p.name}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index ? "w-8 bg-primary" : "w-2 bg-on-surface-variant/35 hover:bg-primary/60"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right product meta */}
          <div
            key={`meta-${product.id}`}
            className="order-3 space-y-3 text-left lg:text-right landing-fade max-w-xs lg:ml-auto"
          >
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
              {product.category}
            </p>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{product.name}</h2>
            <p className="font-headline-lg text-headline-lg text-primary">{formatKes(product.price)}</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant hover:text-primary uppercase tracking-wider transition-colors lg:justify-end"
            >
              Browse shop
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
