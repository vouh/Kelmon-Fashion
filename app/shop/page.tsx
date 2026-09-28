import ShopClient from "@/components/shop/ShopClient";
import { getCategories, getProducts } from "@/lib/supabase/products";

export const metadata = {
  title: "Shop — Kelmon",
  description: "Bags, perfumes, fashion and nails for campus.",
};

interface ShopPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [params, products, categories] = await Promise.all([
    searchParams,
    getProducts(),
    getCategories(),
  ]);

  return (
    <ShopClient
      products={products}
      // Only categories that actually have active products, so a filter chip
      // never leads to an empty shelf.
      categories={categories}
      initialQuery={params.q ?? ""}
      initialCategory={params.category ?? "All"}
    />
  );
}
