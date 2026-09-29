import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { getCodePrefixes } from "@/lib/supabase/product-codes";
import ProductsManager from "@/components/admin/ProductsManager";
import { getAllProductsForAdmin } from "@/lib/supabase/products";
import { getAllCategories } from "@/lib/supabase/categories";
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
  const [products, categoryRows, prefixes, { edit }] = await Promise.all([
    getAllProductsForAdmin(),
    getAllCategories(),
    getCodePrefixes(),
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
        <Link
          href="/admin/products/settings"
          title="Product settings — code letters"
          aria-label="Product settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:border-purple-400/40 hover:text-white"
        >
          <span className="material-symbols-outlined text-lg">settings</span>
        </Link>
      }
    >
      <ProductsManager
        key={edit ?? ""}
        initialEditId={edit}
        products={products}
        categories={categories}
        codeLetters={Object.fromEntries(prefixes.map((p) => [p.category.trim().toLowerCase(), p.letter]))}
      />
    </AdminShell>
  );
}
