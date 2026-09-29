import AdminShell from "@/components/admin/AdminShell";
import CategoriesManager from "@/components/admin/CategoriesManager";
import { getAllCategories } from "@/lib/supabase/categories";
import { getAllProductsForAdmin } from "@/lib/supabase/products";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Categories — Kelmon Admin" };

export default async function AdminCategoriesPage() {
  const [categories, products, adminEmail] = await Promise.all([
    getAllCategories(),
    getAllProductsForAdmin(),
    getAdminEmail(),
  ]);

  const productCounts: Record<string, number> = {};
  for (const product of products) {
    productCounts[product.category] = (productCounts[product.category] ?? 0) + 1;
  }

  const inFilter = categories.filter((c) => c.show_in_filter).length;

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Categories"
      subtitle={`${categories.length} total · ${inFilter} shown as shop filters`}
    >
      <CategoriesManager categories={categories} productCounts={productCounts} />
    </AdminShell>
  );
}
