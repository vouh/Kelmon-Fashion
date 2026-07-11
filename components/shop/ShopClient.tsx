"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import FeatureProductCard from "@/components/shop/FeatureProductCard";
import FilterBoard from "@/components/shop/FilterBoard";
import { shopProducts, categories as productCategories } from "@/lib/products";

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

  return (
    <AppShell activeNav="shop">
      <main className="flex-1 w-full flex flex-col min-h-screen bg-[#f5f0f8] dark:bg-background">
        <div className="px-margin-mobile md:px-margin-desktop pt-4 md:pt-6">
          <FilterBoard filters={FILTERS} active={activeCategory} onSelect={setCategory} />
        </div>

        <div className="flex-1 px-margin-mobile md:px-margin-desktop py-8 md:py-10">
          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-base font-medium text-on-surface">No matches</p>
              <button
                type="button"
                onClick={() => router.push("/shop")}
                className="inline-flex h-11 px-7 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider"
              >
                Show all
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12 md:gap-x-7 md:gap-y-14 max-w-[1100px] mx-auto">
              {filtered.map((product) => (
                <FeatureProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
