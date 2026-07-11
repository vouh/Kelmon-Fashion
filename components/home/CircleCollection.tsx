"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface CircleCollectionProps {
  products: Product[];
  title?: string;
}

export default function CircleCollection({
  products,
  title = "Kelmon's Signature Collection",
}: CircleCollectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section className="relative px-margin-mobile md:px-margin-desktop py-16 md:py-20 bg-surface">
      <h2 className="font-headline-lg text-[1.85rem] md:text-[2.35rem] text-on-surface text-center mb-12 md:mb-14 tracking-tight">
        {title}
      </h2>

      <div className="relative max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll collection left"
          className="absolute left-0 md:-left-4 top-[72px] md:top-[88px] z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[#7a3a96] transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            chevron_left
          </span>
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll collection right"
          className="absolute right-0 md:-right-4 top-[72px] md:top-[88px] z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[#7a3a96] transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            chevron_right
          </span>
        </button>

        <div
          ref={trackRef}
          className="flex gap-6 md:gap-10 overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth px-12 md:px-16 pb-2 justify-start md:justify-center"
        >
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="flex-shrink-0 w-40 md:w-48 snap-start text-center group"
            >
              <div className="relative mx-auto w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-surface-container ring-[6px] ring-surface shadow-[0_12px_32px_rgba(142,68,173,0.14)] group-hover:shadow-[0_16px_40px_rgba(142,68,173,0.22)] transition-shadow">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="176px"
                />
              </div>
              <h3 className="mt-5 font-title-lg text-title-lg text-on-surface truncate group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <p className="mt-1 font-body-md text-body-md text-primary font-semibold">
                {formatKes(product.price)}
              </p>
              <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
                {product.category}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
