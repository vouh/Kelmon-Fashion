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

const VISIBLE_DESKTOP = 4;
const VISIBLE_MOBILE = 2;

export default function CircleCollection({
  products,
  title = "The drops are dropping",
}: CircleCollectionProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const didInitScroll = useRef(false);
  const animating = useRef(false);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    moved: boolean;
    pointerId: number | null;
  }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
    pointerId: null,
  });

  const [itemWidth, setItemWidth] = useState(0);
  const [gap, setGap] = useState(32);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [dragging, setDragging] = useState(false);

  const syncButtons = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft < max - 2);
  }, []);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    const isMd = window.matchMedia("(min-width: 768px)").matches;
    const visible = isMd ? VISIBLE_DESKTOP : VISIBLE_MOBILE;
    const g = isMd ? 32 : 24;
    const width = Math.max(0, (el.clientWidth - g * (visible - 1)) / visible);

    setGap(g);
    setItemWidth(width);

    if (!didInitScroll.current && width > 0 && products.length > visible) {
      const startIndex = Math.min(
        Math.max(1, Math.floor((products.length - visible) / 2)),
        products.length - visible
      );
      el.scrollLeft = startIndex * (width + g);
      didInitScroll.current = true;
    }

    syncButtons();
  }, [products.length, syncButtons]);

  useEffect(() => {
    didInitScroll.current = false;
    const el = viewportRef.current;
    if (!el) return;

    measure();
    const raf = requestAnimationFrame(measure);

    el.addEventListener("scroll", syncButtons, { passive: true });
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", syncButtons);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, syncButtons, products.length]);

  // Wheel / trackpad → horizontal scroll over the strip
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const mostlyHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = mostlyHorizontal ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 0.5) return;

      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;

      e.preventDefault();
      el.scrollLeft = Math.max(0, Math.min(el.scrollLeft + delta, max));
      syncButtons();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [syncButtons]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = viewportRef.current;
    if (!el) return;

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
      pointerId: e.pointerId,
    };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = viewportRef.current;
    if (!drag.active || !el) return;

    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    el.scrollLeft = drag.startScroll - dx;
    syncButtons();
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = dragRef.current;
    if (el && drag.pointerId != null && el.hasPointerCapture(drag.pointerId)) {
      el.releasePointerCapture(drag.pointerId);
    }
    drag.active = false;
    drag.pointerId = null;
    setDragging(false);
  };

  const scrollByOne = (dir: -1 | 1) => {
    const el = viewportRef.current;
    if (!el || animating.current) return;

    const step = itemWidth > 0 ? itemWidth + gap : el.clientWidth / VISIBLE_DESKTOP;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const start = el.scrollLeft;
    const target = Math.max(0, Math.min(start + dir * step, max));
    const distance = target - start;
    if (Math.abs(distance) < 1) return;

    animating.current = true;
    const duration = 480;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      el.scrollLeft = start + distance * eased;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        animating.current = false;
        syncButtons();
      }
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

        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`min-w-0 overflow-x-auto overflow-y-hidden hide-scrollbar py-5 touch-pan-x overscroll-x-contain select-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* w-max forces the row wider than the viewport so it truly scrolls */}
          <div
            ref={trackRef}
            className="flex w-max flex-nowrap items-start"
            style={{ gap }}
          >
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                draggable={false}
                onClick={(e) => {
                  if (dragRef.current.moved) {
                    e.preventDefault();
                    dragRef.current.moved = false;
                  }
                }}
                className="shrink-0 grow-0 text-center group pt-2 pb-1"
                style={
                  itemWidth > 0
                    ? { width: itemWidth, flexBasis: itemWidth }
                    : { width: 160, flexBasis: 160 }
                }
              >
                <div className="mx-auto w-fit p-2 pointer-events-none">
                  <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-surface-container ring-[5px] ring-white dark:ring-surface shadow-[0_12px_32px_rgba(142,68,173,0.14)] group-hover:shadow-[0_16px_40px_rgba(142,68,173,0.22)] transition-shadow">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      unoptimized
                      draggable={false}
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
