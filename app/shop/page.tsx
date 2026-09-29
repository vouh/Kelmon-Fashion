import ShopClient from "@/components/shop/ShopClient";
import { getProducts } from "@/lib/supabase/products";
import { getFilterCategories } from "@/lib/supabase/categories";

import { pageMetadata } from "@/lib/seo";

/** Category views (?category=Perfumes) get their own title and description. */
export async function generateMetadata({ searchParams }: ShopPageProps) {
  const { category } = await searchParams;
  if (category && category !== "All") {
    return pageMetadata({
      title: `${category} — Shop ${category} Online in Kenya`,
      description: `Shop ${category.toLowerCase()} at Kelmon. Campus-ready styles, M-Pesa checkout and free delivery on orders over KES 3,000.`,
      path: `/shop?category=${encodeURIComponent(category)}`,
    });
  }
  return pageMetadata({
    title: "Shop Bags, Perfumes & Accessories in Kenya",
    description:
      "Browse Kelmon's full collection of handbags, ladies' perfumes, men's colognes and accessories. Pay with M-Pesa and get free campus delivery over KES 3,000.",
    path: "/shop",
  });
}

interface ShopPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const [params, products, categories] = await Promise.all([
    searchParams,
    getProducts(),
    // Chosen in /admin/categories, so the chip row stays short.
    getFilterCategories(),
  ]);

  return (
    <ShopClient
      products={products}
      categories={categories}
      initialQuery={params.q ?? ""}
      initialCategory={params.category ?? "All"}
    />
  );
}
