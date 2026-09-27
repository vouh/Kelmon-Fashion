import AdminShell from "@/components/admin/AdminShell";
import DealsManager from "@/components/admin/DealsManager";
import { getDeals } from "@/lib/supabase/content";

export const metadata = { title: "Manage Deals — Kelmon Admin" };

/** Port of admin/deals.html. */
export default async function AdminDealsPage() {
  const deals = await getDeals(false);

  return (
    <AdminShell title="Manage Deals" subtitle={`${deals.length} total`}>
      <DealsManager deals={deals} />
    </AdminShell>
  );
}
