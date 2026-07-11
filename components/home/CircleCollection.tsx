"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface CircleCollectionProps {
  products: Product[];
  title?: string;
}

const VISIBLE_DESKTOP = 4;

export default function CircleCollection({
  products,
  title = "Kelmon's Signature Collection",
}: CircleCollectionProps) {
  const [start, setStart] = useState(0);

  if (products.length === 0) return null;

  // Use desktop page size for arrow logic; mobile shows fewer via CSS grid
  const maxStart = Math.max(0, products.length - VISIBLE_DESKTOP);
  const pageStart = Math.min(start, maxStart);
  const visible = products.slice(pageStart, pageStart + VISIBLE_DESKTOP);

  const canPrev = pageStart > 0;
  const canNext = pageStart + VISIBLE_DESKTOP < products.length;

  const go = (dir: -1 | 1) => {
    setStart((s) => Math.max(0, Math.min(s + dir * VISIBLE_DESKTOP, maxStart)));
  };

  return (
    <section className="relative px-margin-mobile md:px-margin-desktop py-16 md:py-20 bg-surface">
      <h2 className="font-headline-lg text-[1.85rem] md:text-[2.35rem] text-on-surface text-center mb-12 md:mb-14 tracking-tight">
        {title}
      </h2>

      <div className="relative max-w-5xl mx-auto px-10 md:px-14">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canPrev}
          aria-label="Previous products"
          className="absolute left-0 top-[72px] md:top-[88px] z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[#7a3a96] transition-colors disabled:opacity-35 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            chevron_left
          </span>
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canNext}
          aria-label="Next products"
          className="absolute right-0 top-[72px] md:top-[88px] z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[#7a3a96] transition-colors disabled:opacity-35 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            chevron_right
          </span>
        </button>

        {/* Exactly 4 slots on desktop — overflow hidden, no partial circles */}
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {visible.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="text-center group min-w-0"
              >
                <div className="relative mx-auto w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-surface-container ring-[6px] ring-white dark:ring-surface shadow-[0_12px_32px_rgba(142,68,173,0.14)] group-hover:shadow-[0_16px_40px_rgba(142,68,173,0.22)] transition-shadow">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="176px"
                  />
                </div>
                <h3 className="mt-5 text-sm md:text-base font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm text-primary font-semibold">
                  {formatKes(product.price)}
                </p>
                <p className="mt-0.5 text-sm text-on-surface-variant">{product.category}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
