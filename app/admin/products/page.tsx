import AdminShell from "@/components/admin/AdminShell";
import ProductsManager from "@/components/admin/ProductsManager";
import { getAllProductsForAdmin } from "@/lib/supabase/products";
import { getAllCategories } from "@/lib/supabase/categories";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Products — Kelmon Admin" };

/**
 * New page — EzyBite's admin had no products screen (its menu was hardcoded).
 * Fashion inventory needs sizes, colors and stock, so this is built from scratch.
 */
export default async function AdminProductsPage() {
  const [products, categoryRows] = await Promise.all([
    getAllProductsForAdmin(),
    getAllCategories(),
  ]);

  const categories = categoryRows.map((c) => c.name);

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell adminEmail={adminEmail} title="Products" subtitle={`${products.length} in catalogue`}>
      <ProductsManager products={products} categories={categories} />
    </AdminShell>
  );
}
