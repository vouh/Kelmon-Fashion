"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

interface CircleCollectionProps {
  products: Product[];
  title?: string;
}

const VISIBLE = 4;

export default function CircleCollection({
  products,
  title = "The drops are dropping",
}: CircleCollectionProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [itemWidth, setItemWidth] = useState(0);
  const [gap, setGap] = useState(32);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const isMd = window.matchMedia("(min-width: 768px)").matches;
    const visible = isMd ? VISIBLE : 2;
    const g = isMd ? 32 : 24;
    setGap(g);
    setItemWidth((el.clientWidth - g * (visible - 1)) / visible);
  }, []);

  const syncButtons = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    measure();
    requestAnimationFrame(syncButtons);
    el.addEventListener("scroll", syncButtons, { passive: true });
    const ro = new ResizeObserver(() => {
      measure();
      requestAnimationFrame(syncButtons);
    });
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", syncButtons);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, syncButtons, products.length]);

  /** Scroll one circle at a time — slow & natural */
  const scrollByOne = (dir: -1 | 1) => {
    const el = viewportRef.current;
    if (!el) return;
    const step = itemWidth > 0 ? itemWidth + gap : el.clientWidth / VISIBLE;
    const start = el.scrollLeft;
    const target = Math.max(
      0,
      Math.min(start + dir * step, el.scrollWidth - el.clientWidth)
    );
    const distance = target - start;
    if (Math.abs(distance) < 1) return;

    const duration = 520;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      // ease-in-out
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      el.scrollLeft = start + distance * eased;
      if (t < 1) requestAnimationFrame(tick);
      else syncButtons();
    };

    requestAnimationFrame(tick);
  };

  if (products.length === 0) return null;

  return (
    <section className="relative px-margin-mobile md:px-margin-desktop py-16 md:py-20 bg-surface">
      <h2 className="font-headline-lg text-[1.85rem] md:text-[2.35rem] text-on-surface text-center mb-12 md:mb-14 tracking-tight">
        {title}
      </h2>

      <div className="relative max-w-5xl mx-auto px-10 md:px-14">
        <button
          type="button"
          onClick={() => scrollByOne(-1)}
          disabled={!canPrev}
          aria-label="Previous drop"
          className="absolute left-0 top-[88px] md:top-[100px] z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[#7a3a96] transition-colors disabled:opacity-35 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            chevron_left
          </span>
        </button>
        <button
          type="button"
          onClick={() => scrollByOne(1)}
          disabled={!canNext}
          aria-label="Next drop"
          className="absolute right-0 top-[88px] md:top-[100px] z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-[#7a3a96] transition-colors disabled:opacity-35 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            chevron_right
          </span>
        </button>

        {/* Vertical padding keeps glow from being clipped */}
        <div
          ref={viewportRef}
          className="overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory py-5"
        >
          <div className="flex items-start" style={{ gap }}>
            {products.map((product, i) => {
              const midGlow = i % VISIBLE === 1 || i % VISIBLE === 2;
              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="snap-start text-center group shrink-0 pt-2 pb-1"
                  style={
                    itemWidth > 0
                      ? { width: itemWidth, minWidth: itemWidth }
                      : { width: "25%", minWidth: "25%" }
                  }
                >
                  {/* Outer pad so glow has room inside the cell */}
                  <div className="mx-auto w-fit p-2">
                    <div
                      className={`relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-surface-container ring-[5px] ${
                        midGlow
                          ? "ring-primary/35 shadow-[0_0_24px_8px_rgba(142,68,173,0.28)]"
                          : "ring-white dark:ring-surface shadow-[0_10px_28px_rgba(142,68,173,0.12)]"
                      }`}
                    >
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="176px"
                      />
                    </div>
                  </div>
                  <h3 className="mt-3 text-sm md:text-base font-semibold text-on-surface truncate group-hover:text-primary transition-colors px-1">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm text-primary font-semibold">
                    {formatKes(product.price)}
                  </p>
                  <p className="mt-0.5 text-sm text-on-surface-variant">{product.category}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
