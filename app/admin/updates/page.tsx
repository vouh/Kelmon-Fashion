import AdminShell from "@/components/admin/AdminShell";
import UpdatesManager from "@/components/admin/UpdatesManager";
import { getUpdates } from "@/lib/supabase/content";

export const metadata = { title: "Updates — Kelmon Admin" };

/** Port of admin/updates.html. */
export default async function AdminUpdatesPage() {
  const updates = await getUpdates();

  return (
    <AdminShell title="Updates" subtitle={`${updates.length} published`}>
      <UpdatesManager updates={updates} />
    </AdminShell>
  );
}
