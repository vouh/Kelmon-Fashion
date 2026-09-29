import AdminShell from "@/components/admin/AdminShell";
import NotificationsFeed from "@/components/admin/NotificationsFeed";
import { getNotifications } from "@/lib/supabase/admin-inbox";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Notifications — Kelmon Admin" };

/** New orders, payments, failed payments, stock alerts and contact messages. */
export default async function AdminNotificationsPage() {
  const [notifications, adminEmail] = await Promise.all([getNotifications(), getAdminEmail()]);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Notifications"
      subtitle={unread ? `${unread} unread` : "All caught up"}
    >
      <NotificationsFeed notifications={notifications} />
    </AdminShell>
  );
}
