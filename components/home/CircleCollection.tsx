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
    <section className="px-margin-mobile md:px-margin-desktop py-xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">{title}</h2>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll collection left"
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#7a3a96] transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll collection right"
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#7a3a96] transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-8 overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth pb-2"
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="flex-shrink-0 w-44 md:w-52 snap-start text-center group"
          >
            <div className="relative mx-auto w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-primary/20 bg-white shadow-[0_12px_28px_rgba(142,68,173,0.15)] group-hover:border-primary transition-colors">
              <Image
                src={product.image}
                alt={product.name}
                fill
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="192px"
              />
            </div>
            <h3 className="mt-4 font-title-lg text-title-lg text-on-surface truncate group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <p className="mt-1 font-body-md text-body-md text-secondary">{formatKes(product.price)}</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{product.category}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
