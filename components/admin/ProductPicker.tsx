"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { formatKes } from "@/components/admin/ui";
import type { Product } from "@/lib/products";

// text-base on phones: iOS zooms the page into any input under 16px.
const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-800 py-3 pl-10 pr-11 text-base text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none sm:text-sm";

/**
 * Search box with a dropdown of the catalogue. Tapping the box (or the arrow)
 * lists every product to scroll through; typing narrows it down.
 *
 * The list floats just under the box (fixed, measured from it) rather than
 * sitting in the flow, so it overlays the popup instead of pushing it down —
 * and isn't clipped by the popup's scrolling body.
 */
export default function ProductPicker({
  products,
  onPick,
  placeholder = "Search or pick a product…",
  autoFocus = false,
  onTypeIn,
}: {
  products: Product[];
  onPick: (product: Product) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** When given, offers "add as a typed item" with what was typed. */
  onTypeIn?: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  // Keep the list pinned under the box as the page scrolls, resizes, or the
  // phone keyboard opens.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const top = rect.bottom + 4;
      setBox({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(160, Math.min(viewport * 0.5, viewport - top - 12)),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open]);

  // A tap anywhere outside the box and the list closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.code ?? "").toLowerCase().includes(term)
    );
  }, [products, query]);

  function pick(product: Product) {
    onPick(product);
    setQuery("");
    setOpen(false);
  }

  return (
    <div>
      <div ref={anchorRef} className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-white/30">
          search
        </span>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (query.trim() && matches[0]) pick(matches[0]);
            } else if (e.key === "Escape" && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls="product-picker-list"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Hide products" : "Show all products"}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 hover:text-white"
        >
          <span className={`material-symbols-outlined text-xl transition-transform ${open ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>
      </div>

      {open && box && (
        <ul
          ref={listRef}
          id="product-picker-list"
          style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
          className="fixed z-[130] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40"
        >
          {matches.map((product) => {
            const stock = product.stock ?? 0;
            return (
              <li key={product.id} className="border-b border-white/5 last:border-0">
                <button
                  type="button"
                  onClick={() => pick(product)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left active:bg-white/10 sm:hover:bg-white/5"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                    <Image src={product.image} alt="" fill unoptimized className="object-cover" sizes="40px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{product.name}</p>
                    <p
                      className={`text-[11px] ${
                        stock <= 0 ? "text-red-400" : stock <= 3 ? "text-amber-300" : "text-white/35"
                      }`}
                    >
                      {product.code ? `${product.code} · ` : ""}
                      {stock <= 0 ? "Out of stock" : `${stock} in stock`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-purple-300">{formatKes(product.price)}</span>
                </button>
              </li>
            );
          })}
          {matches.length === 0 && <li className="px-3 py-2.5 text-xs text-white/40">No match.</li>}
          {onTypeIn && query.trim() && (
            <li className="border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  onTypeIn(query.trim());
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-bold text-white/50 active:bg-white/10 sm:hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Add &ldquo;{query.trim()}&rdquo; as a typed item (reconcile later)
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
