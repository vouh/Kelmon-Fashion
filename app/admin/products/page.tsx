import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { getCodePrefixes } from "@/lib/supabase/product-codes";
import ProductsManager from "@/components/admin/ProductsManager";
import { getAllProductsForAdmin } from "@/lib/supabase/products";
import { getAllCategories } from "@/lib/supabase/categories";
import { getProductCosts } from "@/lib/supabase/finance";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Products — Kelmon Admin" };

/**
 * New page — EzyBite's admin had no products screen (its menu was hardcoded).
 * Fashion inventory needs sizes, colors and stock, so this is built from scratch.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const [products, categoryRows, prefixes, costs, { edit }] = await Promise.all([
    getAllProductsForAdmin(),
    getAllCategories(),
    getCodePrefixes(),
    getProductCosts(),
    searchParams,
  ]);

  const categories = categoryRows.map((c) => c.name);

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Products"
      subtitle={`${products.length} in catalogue`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/categories"
            title="Add and manage categories"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 transition hover:border-purple-400/40 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">category</span> Categories
          </Link>
          <Link
            href="/admin/products/settings"
            title="Product settings — code letters"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 transition hover:border-purple-400/40 hover:text-white"
          >
            <span className="material-symbols-outlined text-base">settings</span> Settings
          </Link>
        </div>
      }
    >
      <ProductsManager
        key={edit ?? ""}
        initialEditId={edit}
        products={products}
        costs={costs}
        categories={categories}
        codeLetters={Object.fromEntries(prefixes.map((p) => [p.category.trim().toLowerCase(), p.letter]))}
      />
    </AdminShell>
  );
}
