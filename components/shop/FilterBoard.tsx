"use client";

import { useEffect, useRef, useState } from "react";

interface FilterBoardProps {
  filters: string[];
  active: string;
  onSelect: (filter: string) => void;
}

export default function FilterBoard({ filters, active, onSelect }: FilterBoardProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

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
        <div
          role="tablist"
          aria-label="Product categories"
          className="flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory justify-center"
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
                className={`snap-start shrink-0 rounded-full font-semibold uppercase tracking-[0.12em] transition-all duration-300 ${
                  stuck
                    ? "h-8 px-3.5 text-[10px]"
                    : "h-10 px-5 text-[11px]"
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
    </>
  );
}
