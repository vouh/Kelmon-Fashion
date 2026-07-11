"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { shopProducts, formatKes, type Product } from "@/lib/products";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Product[];
    return shopProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[18vh] md:pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <button
        type="button"
        className="absolute inset-0 bg-primary/25 backdrop-blur-md search-overlay-backdrop"
        aria-label="Close search"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl search-overlay-panel">
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-[0_20px_60px_rgba(142,68,173,0.25)] border-2 border-primary/30 px-4 py-3">
          <span className="material-symbols-outlined text-primary text-[28px]" aria-hidden="true">
            search
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bags, perfumes, fashion..."
            className="flex-1 min-w-0 h-12 bg-transparent text-on-surface font-body-lg text-body-lg placeholder:text-on-surface-variant/50 focus:outline-none"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-2xl bg-white border border-primary/20 shadow-[0_16px_40px_rgba(142,68,173,0.2)]">
          {!query.trim() && (
            <p className="px-5 py-6 font-body-md text-body-md text-on-surface-variant text-center">
              Start typing to find products
            </p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="px-5 py-6 font-body-md text-body-md text-on-surface-variant text-center">
              No products match &ldquo;{query.trim()}&rdquo;
            </p>
          )}
          {results.length > 0 && (
            <ul className="divide-y divide-primary/10">
              {results.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/product/${product.id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-primary/5 transition-colors"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-surface-container shrink-0">
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-title-lg text-title-lg text-on-surface truncate">
                        {product.name}
                      </p>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {product.category}
                      </p>
                    </div>
                    <p className="font-body-md text-body-md text-primary font-semibold shrink-0">
                      {formatKes(product.price)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
