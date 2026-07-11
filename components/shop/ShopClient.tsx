"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import StarRating from "@/components/ui/StarRating";
import { shopProducts, formatKes, categories as productCategories } from "@/lib/products";

const FILTERS = ["All", ...productCategories];

interface ShopClientProps {
  initialQuery?: string;
  initialCategory?: string;
}

export default function ShopClient({ initialQuery = "", initialCategory = "All" }: ShopClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const activeCategory = FILTERS.includes(initialCategory) ? initialCategory : "All";

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shopProducts.filter((p) => {
      const catOk = activeCategory === "All" || p.category === activeCategory;
      const qOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [query, activeCategory]);

  const setCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (cat !== "All") params.set("category", cat);
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (activeCategory !== "All") params.set("category", activeCategory);
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  };

  return (
    <AppShell activeNav="shop">
      <main className="flex-1 w-full flex flex-col min-h-screen">
        <div className="px-margin-mobile md:px-margin-desktop pt-lg pb-md bg-surface border-b border-white/5 sticky top-0 z-30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface mb-2 tracking-tight">Products</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Bags, perfumes, fashion &amp; nails for campus.
              </p>
            </div>
            <form onSubmit={onSearch} className="w-full md:w-96 relative" role="search">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">
                search
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-dark w-full h-12 pl-12 pr-4 rounded-lg text-on-surface font-body-md text-body-md placeholder-on-surface-variant/50 focus:ring-2 focus:ring-primary-container/40"
                placeholder="Search products..."
                type="search"
                aria-label="Search products"
              />
            </form>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categories">
            {FILTERS.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setCategory(cat)}
                  className={`chip px-4 py-2 min-h-10 rounded-full font-label-caps text-label-caps uppercase transition-colors ${
                    isActive ? "active" : "hover:bg-secondary/20 hover:text-secondary"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-margin-mobile md:p-margin-desktop bg-background">
          <p className="font-body-md text-body-md text-on-surface-variant mb-6" aria-live="polite">
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
            {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
            {query.trim() ? ` matching “${query.trim()}”` : ""}
          </p>

          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <p className="font-headline-sm text-headline-sm text-on-surface">No matches</p>
              <p className="font-body-md text-body-md text-on-surface-variant">Try another category or clear search.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  router.push("/shop");
                }}
                className="inline-flex h-12 px-6 rounded-lg btn-secondary font-button-text text-button-text"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
              {filtered.map((product) => (
                <div key={product.id} className="product-card rounded-2xl overflow-hidden flex flex-col group relative">
                  {product.badge && (
                    <div className="absolute top-4 right-4 z-10 bg-primary-container/90 text-white px-3 py-1 rounded-full font-label-caps text-label-caps uppercase backdrop-blur-sm">
                      {product.badge}
                    </div>
                  )}
                  <Link href={`/product/${product.id}`} className="aspect-[4/5] relative overflow-hidden bg-surface-dim block">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </Link>
                  <div className="p-5 flex flex-col flex-1">
                    <Link
                      href={`/product/${product.id}`}
                      className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors mb-2"
                    >
                      {product.name}
                    </Link>
                    <StarRating rating={product.rating} reviewCount={product.reviewCount} />
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <div>
                        {product.originalPrice && (
                          <span className="text-xs text-on-surface-variant line-through block mb-1">
                            {formatKes(product.originalPrice)}
                          </span>
                        )}
                        <p className="font-headline-sm text-headline-sm text-secondary">{formatKes(product.price)}</p>
                      </div>
                      <Link
                        href={`/product/${product.id}`}
                        aria-label={`View ${product.name}`}
                        className="btn-primary w-11 h-11 rounded-full flex items-center justify-center text-white"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
