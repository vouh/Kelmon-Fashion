"use client";

import { useEffect, useRef, useState } from "react";

interface FilterBoardProps {
  filters: string[];
  active: string;
  onSelect: (filter: string) => void;
}

export default function FilterBoard({ filters, active, onSelect }: FilterBoardProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // Keep the selected chip in view, e.g. when arriving on /shop?category=Nails.
  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!rail || !chip) return;
    const left = chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      {
        // Match floating nav clearance (~84px mobile / ~88px desktop)
        rootMargin: "-84px 0px 0px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
      <div
        className={`sticky z-40 transition-all duration-300 ${
          stuck
            ? "top-[4.75rem] md:top-[5.5rem] py-2 -mx-margin-mobile md:-mx-margin-desktop px-margin-mobile md:px-margin-desktop bg-[#f5f0f8]/95 dark:bg-background/95 backdrop-blur-xl border-b border-primary/10 shadow-[0_4px_16px_rgba(142,68,173,0.08)]"
            : "top-[4.75rem] md:top-[5.5rem] py-1"
        }`}
      >
        {/* Scrolls edge to edge on phones. The inner row is centred with mx-auto
            rather than justify-center, which would push the first chips off the
            left edge where they can't be scrolled back to. */}
        <div
          ref={railRef}
          className="-mx-margin-mobile overflow-x-auto overscroll-x-contain hide-scrollbar scroll-smooth snap-x snap-proximity md:mx-0"
        >
          <div
            role="tablist"
            aria-label="Product categories"
            className="mx-auto flex w-max gap-1.5 px-margin-mobile md:gap-2 md:px-0"
          >
            {filters.map((filter) => {
              const isActive = active === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelect(filter)}
                  className={`snap-start scroll-mx-4 shrink-0 whitespace-nowrap rounded-full font-semibold uppercase transition-all duration-300 ${
                    stuck
                      ? "h-7 px-3 text-[9.5px] tracking-[0.08em] md:h-8 md:px-3.5 md:text-[10px] md:tracking-[0.12em]"
                      : "h-8 px-3.5 text-[10px] tracking-[0.08em] md:h-10 md:px-5 md:text-[11px] md:tracking-[0.12em]"
                  } ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-surface-container text-on-surface-variant border border-primary/15 hover:border-primary hover:text-primary"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
