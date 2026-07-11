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
      className="relative overflow-hidden bg-[#faf6fc] dark:bg-surface-dim"
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative max-w-[1200px] mx-auto px-6 md:px-12 pt-28 md:pt-32 pb-10 md:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-8 lg:gap-4 min-h-[70vh]">
          {/* Left — identical layout to reference */}
          <div
            key={`left-${product.id}-${index}`}
            className={`order-2 lg:order-1 flex flex-col justify-center ${animClass}`}
          >
            <h1 className="font-display-lg text-[2.75rem] md:text-[3.5rem] font-semibold leading-[1.1] text-on-surface tracking-tight max-w-[14ch]">
              {copy.headline}
            </h1>
            <p className="mt-5 font-body-md text-[0.95rem] md:text-base text-on-surface-variant leading-relaxed max-w-[32ch]">
              {copy.description}
            </p>
            <Link
              href={`/product/${product.id}`}
              className="mt-7 inline-flex self-start h-11 px-7 rounded-full bg-primary text-white text-[0.7rem] font-semibold uppercase tracking-[0.16em] items-center gap-1 hover:bg-[#7a3a96] transition-colors"
            >
              Buy now
              <span className="text-[0.85rem] leading-none" aria-hidden="true">
                ≫
              </span>
            </Link>
          </div>

          {/* Center — solid arch backdrop + product ON TOP (not cropped fill) */}
          <div className="relative order-1 lg:order-2 flex flex-col items-center justify-center">
            <div className="relative w-[240px] sm:w-[280px] md:w-[300px] h-[420px] sm:h-[480px] md:h-[520px]">
              {/* Solid arch shape — like Eloréa */}
              <div
                className="hero-arch-solid absolute inset-0 bg-[#eadff3] dark:bg-surface-container"
                aria-hidden="true"
              />

              {/* Product floating over arch */}
              <div
                key={`img-${product.id}-${index}`}
                className={`absolute inset-x-[8%] inset-y-[6%] z-10 ${animClass}`}
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  unoptimized
                  priority
                  className="object-contain drop-shadow-[0_20px_40px_rgba(42,26,54,0.18)]"
                  sizes="300px"
                />
              </div>

              {/* Arrows on arch edges */}
              <button
                type="button"
                onClick={() => goTo(index - 1, "prev")}
                aria-label="Previous product"
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center hover:bg-black transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1, "next")}
                aria-label="Next product"
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#7a3a96] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>

            {/* Pagination — small bars under arch */}
            <div className="flex items-center gap-2 mt-5" role="tablist" aria-label="Hero products">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={p.name}
                  onClick={() => goTo(i, i > index ? "next" : "prev")}
                  className={`h-1 rounded-[1px] transition-all duration-300 ${
                    i === index ? "w-5 bg-primary" : "w-3 bg-on-surface/25 hover:bg-on-surface/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right — product meta */}
          <div
            key={`right-${product.id}-${index}`}
            className={`order-3 flex flex-col justify-center text-left lg:text-right ${animClass}`}
          >
            <h2 className="font-display-lg text-xl md:text-2xl font-semibold text-on-surface">
              {product.name}
            </h2>
            <p className="mt-1.5 font-body-md text-sm text-on-surface-variant">{copy.notes}</p>
            <p className="mt-4 font-display-lg text-3xl md:text-4xl font-semibold text-on-surface tracking-tight">
              {formatKes(product.price)}
            </p>
          </div>
        </div>

        {/* Social icons — bottom right like reference */}
        <div className="hidden lg:flex absolute bottom-8 right-12 gap-5 text-on-surface/55">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-primary transition-colors text-sm font-semibold">
            f
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors text-sm font-semibold">
            in
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              photo_camera
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
