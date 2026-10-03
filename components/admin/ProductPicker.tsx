"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { formatKes } from "@/components/admin/ui";
import type { Product } from "@/lib/products";
import { dropdownInputClass, dropdownListClass, useAnchoredDropdown } from "@/components/admin/useAnchoredDropdown";

/**
 * Search box with a dropdown of the catalogue. Tapping the box (or the arrow)
 * lists every product to scroll through; typing narrows it down.
 * The list floats under the box (see useAnchoredDropdown).
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
  const { open, setOpen, anchorRef, listRef, box } = useAnchoredDropdown();

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
          className={dropdownInputClass}
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
          className={dropdownListClass}
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
