import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import CodeLettersManager from "@/components/admin/CodeLettersManager";
import { getAllCategories } from "@/lib/supabase/categories";
import { getCodePrefixSummaries } from "@/lib/supabase/product-codes";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Product Settings — Kelmon Admin" };

/** Code letters per category (P = Perfumes, B = Bags…) and how far each has got. */
export default async function ProductSettingsPage() {
  const [prefixes, categoryRows, adminEmail] = await Promise.all([
    getCodePrefixSummaries(),
    getAllCategories(),
    getAdminEmail(),
  ]);

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Product Settings"
      subtitle="Product code letters"
      actions={
        <Link
          href="/admin/products"
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 transition hover:text-white"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span> Products
        </Link>
      }
    >
      <CodeLettersManager prefixes={prefixes} categories={categoryRows.map((c) => c.name)} />
    </AdminShell>
  );
}
