import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import AccountsManager from "@/components/admin/AccountsManager";
import { getAccounts } from "@/lib/supabase/accounts";
import { getAdminAccess, getAdminEmail } from "@/lib/supabase/server";

export const metadata = { title: "Accounts — Kelmon Admin" };

/** Every registered account with its orders and payments. Super admins only. */
export default async function AdminAccountsPage() {
  const access = await getAdminAccess();
  if (!access?.superAdmin) redirect("/admin");

  const [accounts, adminEmail] = await Promise.all([getAccounts(), getAdminEmail()]);

  return (
    <AdminShell
      adminEmail={adminEmail}
      title="Accounts"
      subtitle={`${accounts.length} registered account${accounts.length === 1 ? "" : "s"}`}
    >
      <AccountsManager accounts={accounts} />
    </AdminShell>
  );
}
