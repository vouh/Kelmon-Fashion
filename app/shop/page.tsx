import ShopClient from "@/components/shop/ShopClient";
import { getCategories, getProducts } from "@/lib/supabase/products";
import { categories as fallbackCategories } from "@/lib/products";

export const metadata = {
  title: "Shop — Kelmon",
  description: "Bags, perfumes, fashion and nails for campus.",
};

interface ShopPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [params, products, liveCategories] = await Promise.all([
    searchParams,
    getProducts(),
    getCategories(),
  ]);

  return (
    <ShopClient
      products={products}
      categories={liveCategories.length ? liveCategories : fallbackCategories}
      initialQuery={params.q ?? ""}
      initialCategory={params.category ?? "All"}
    />
  );
}
