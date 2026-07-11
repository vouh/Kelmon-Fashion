"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface HeroShowcaseProps {
  products: Product[];
  autoPlayMs?: number;
}

const slideCopy: Record<string, { headline: string; description: string; notes: string }> = {
  "chanel-no5-mini": {
    headline: "Scent Of Campus",
    description:
      "A timeless mini fragrance for lectures, late nights, and every moment in between.",
    notes: "Floral, Soft Musk",
  },
  "lv-speedy-bag": {
    headline: "Carry The Look",
    description:
      "Statement bags that turn hostel corridors into a runway — delivered to your door.",
    notes: "Leather, Everyday Glam",
  },
  "gel-manicure-kit": {
    headline: "Nails That Last",
    description:
      "Salon-ready gel kits for chip-free shine that survives campus life.",
    notes: "Gel, Long Wear",
  },
  "dior-sauvage": {
    headline: "Bold & Fresh",
    description:
      "A signature scent with edge — made for nights out and big days on campus.",
    notes: "Citrus, Spice",
  },
  "crossbody-mini-bag": {
    headline: "Light & Luxe",
    description:
      "Compact crossbodies for class-to-cafe days without compromising style.",
    notes: "Compact, Hands-Free",
  },
  "gold-hoop-earrings": {
    headline: "Gold Glow Up",
    description:
      "Everyday hoops that catch the light — simple, bold, and always on trend.",
    notes: "Gold Tone, Classic",
  },
};

function getCopy(product: Product) {
  return (
    slideCopy[product.id] ?? {
      headline: "Glam Of Campus",
      description:
        "Designer bags, signature scents, nails, and fashion — curated for UoN.",
      notes: product.category,
    }
  );
}

export default function HeroShowcase({ products, autoPlayMs = 5000 }: HeroShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [paused, setPaused] = useState(false);
  const count = products.length;

  const goTo = useCallback(
    (nextIndex: number, dir: "next" | "prev") => {
      if (count === 0) return;
      setDirection(dir);
      setIndex(((nextIndex % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = window.setInterval(() => {
      setDirection("next");
      setIndex((i) => (i + 1) % count);
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [count, paused, autoPlayMs]);

  if (count === 0) return null;

  const product = products[index];
  const copy = getCopy(product);
  const animClass =
    direction === "next" ? "hero-slide-in-right" : "hero-slide-in-left";

  return (
    <section
      className="relative overflow-hidden bg-surface-dim"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative px-margin-mobile md:px-margin-desktop pt-24 md:pt-28 pb-12 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)_minmax(0,1fr)] gap-10 lg:gap-6 items-center min-h-[68vh]">
          {/* Left copy — moves with slide */}
          <div
            key={`left-${product.id}-${index}`}
            className={`order-2 lg:order-1 space-y-5 max-w-md ${animClass}`}
          >
            <h1 className="font-display-lg text-[2.5rem] md:text-[3.25rem] leading-[1.12] text-on-surface tracking-tight">
              {copy.headline}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-sm">
              {copy.description}
            </p>
            <Link
              href={`/product/${product.id}`}
              className="inline-flex h-12 px-8 rounded-full bg-primary text-white font-button-text text-button-text uppercase tracking-[0.14em] items-center gap-1 hover:bg-[#7a3a96] transition-colors"
            >
              Buy now
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                keyboard_double_arrow_right
              </span>
            </Link>
          </div>

          {/* Center — arch frame + arrows */}
          <div className="relative order-1 lg:order-2 flex flex-col items-center w-full">
            <div className="relative w-full max-w-[320px] md:max-w-[340px] mx-auto">
              {/* Outer soft arch wash (reference overlay) */}
              <div
                className="hero-arch-backdrop absolute inset-x-[-6%] inset-y-[-2%] bg-primary/10 pointer-events-none"
                aria-hidden="true"
              />

              <div
                key={`img-${product.id}-${index}`}
                className={`hero-arch relative z-[1] w-full aspect-[3/4.2] overflow-hidden bg-surface-container ${animClass}`}
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 75vw, 340px"
                />
              </div>

              <button
                type="button"
                onClick={() => goTo(index - 1, "prev")}
                aria-label="Previous product"
                className="absolute -left-2 md:-left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center shadow-md hover:bg-black transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1, "next")}
                aria-label="Next product"
                className="absolute -right-2 md:-right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[#7a3a96] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>

            <div className="flex gap-2 mt-6" role="tablist" aria-label="Hero products">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={p.name}
                  onClick={() => goTo(i, i > index ? "next" : "prev")}
                  className={`h-1.5 rounded-sm transition-all duration-300 ${
                    i === index ? "w-6 bg-primary" : "w-4 bg-primary/25 hover:bg-primary/45"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right meta — moves with slide */}
          <div
            key={`right-${product.id}-${index}`}
            className={`order-3 space-y-2 text-left lg:text-right max-w-xs lg:ml-auto ${animClass}`}
          >
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{product.name}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{copy.notes}</p>
            <p className="font-headline-lg text-[1.85rem] md:text-[2.1rem] text-on-surface pt-2 font-semibold tracking-tight">
              {formatKes(product.price)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
