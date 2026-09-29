import AdminShell from "@/components/admin/AdminShell";
import CommunicationsCenter from "@/components/admin/CommunicationsCenter";
import {
  getAudienceCounts,
  getContactMessages,
  getEmailCampaigns,
} from "@/lib/supabase/admin-inbox";
import { getEmailSettings } from "@/lib/email/resend";
import { getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Communications — Kelmon Admin" };

/** Contact-form inbox, email composer and a log of what was sent. */
export default async function AdminCommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const [messages, campaigns, counts, adminEmail, { open }] = await Promise.all([
    getContactMessages(),
    getEmailCampaigns(),
    getAudienceCounts(),
    getAdminEmail(),
    searchParams,
  ]);
  const unread = messages.filter((m) => !m.read).length;

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Communications"
      subtitle={unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Inbox and email"}
    >
      <CommunicationsCenter
        key={open ?? ""}
        initialOpenId={open}
        messages={messages}
        campaigns={campaigns}
        audienceCounts={counts}
        canSend={getEmailSettings().canSendToCustomers}
      />
    </AdminShell>
  );
}
