import AdminShell from "@/components/admin/AdminShell";
import ProductsManager from "@/components/admin/ProductsManager";
import { getAllProductsForAdmin, getCategories } from "@/lib/supabase/products";
import { categories as fallbackCategories } from "@/lib/products";

export const metadata = { title: "Products — Kelmon Admin" };

/**
 * New page — EzyBite's admin had no products screen (its menu was hardcoded).
 * Fashion inventory needs sizes, colors and stock, so this is built from scratch.
 */
export default async function AdminProductsPage() {
  const [products, liveCategories] = await Promise.all([
    getAllProductsForAdmin(),
    getCategories(),
  ]);

  const categories = liveCategories.length ? liveCategories : fallbackCategories;

  return (
    <AdminShell title="Products" subtitle={`${products.length} in catalogue`}>
      <ProductsManager products={products} categories={categories} />
    </AdminShell>
  );
}
