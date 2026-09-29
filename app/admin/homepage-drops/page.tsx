import AdminShell from "@/components/admin/AdminShell";
import HomepageDropsManager from "@/components/admin/HomepageDropsManager";
import { getHomepageDrops } from "@/lib/supabase/content";
import { getAllProductsForAdmin } from "@/lib/supabase/products";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Homepage Drops — Kelmon Admin" };

export default async function HomepageDropsPage() {
  const [drops, products, adminEmail] = await Promise.all([
    getHomepageDrops(false),
    getAllProductsForAdmin(),
    getAdminEmail(),
  ]);
  return (
    <AdminShell adminEmail={adminEmail} title="Homepage Drops" subtitle={`${drops.length} total`}>
      <HomepageDropsManager drops={drops} products={products} />
    </AdminShell>
  );
}
