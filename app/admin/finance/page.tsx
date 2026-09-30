import AdminShell from "@/components/admin/AdminShell";
import FinanceManager from "@/components/admin/FinanceManager";
import { getInventories, getPaidSales } from "@/lib/supabase/finance";
import { getAllProductsForAdmin } from "@/lib/supabase/products";
import { getAdminEmail } from "@/lib/supabase/server";
import { parseDateRange } from "@/lib/date-range";

export const metadata = { title: "Finance — Kelmon Admin" };

/**
 * Stock bought versus money made. Each inventory is one buying trip; the page
 * totals what was invested, what it should earn once everything sells, and
 * what it has earned so far from the pieces marked sold.
 */
export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const [rangeParams, inventories, sales, products, adminEmail] = await Promise.all([
    searchParams,
    getInventories(),
    getPaidSales(),
    getAllProductsForAdmin(),
    getAdminEmail(),
  ]);

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Finance"
      subtitle={`${inventories.length} inventor${inventories.length === 1 ? "y" : "ies"}`}
    >
      <FinanceManager
        inventories={inventories}
        sales={sales}
        products={products
          .map((p) => ({ id: p.id, name: p.name, code: p.code ?? null }))
          .sort((a, b) => a.name.localeCompare(b.name))}
        initialRange={parseDateRange(rangeParams)}
      />
    </AdminShell>
  );
}
