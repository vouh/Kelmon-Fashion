import AdminShell from "@/components/admin/AdminShell";
import UpdatesManager from "@/components/admin/UpdatesManager";
import { getUpdates } from "@/lib/supabase/content";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Updates — Kelmon Admin" };

/** Port of admin/updates.html. */
export default async function AdminUpdatesPage() {
  const updates = await getUpdates();

  const adminEmail = await getAdminEmail();

  return (
    <AdminShell adminEmail={adminEmail} title="Updates" subtitle={`${updates.length} published`}>
      <UpdatesManager updates={updates} />
    </AdminShell>
  );
}
