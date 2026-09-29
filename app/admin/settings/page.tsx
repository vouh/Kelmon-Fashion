import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ContactRecipientsForm from "@/components/admin/ContactRecipientsForm";
import { Panel } from "@/components/admin/ui";
import {
  MAX_CONTACT_RECIPIENTS,
  getEnvContactRecipients,
  getSavedContactRecipients,
} from "@/lib/supabase/admin-inbox";
import { getAdminEmail } from "@/lib/supabase/server";
import { MAX_ORDER_ALERT_RECIPIENTS, getSavedAlertRecipients } from "@/lib/email/alerts";
import { PROTECTED_SUPER_ADMIN_EMAILS } from "@/lib/auth/protected-accounts";

export const metadata = { title: "Settings — Kelmon Admin" };

/** The admin screens that control what the storefront and home page show. */
const CONTENT_LINKS = [
  {
    href: "/admin/homepage-drops",
    icon: "view_carousel",
    label: "Homepage drops",
    hint: "The featured items on the home page",
    color: "text-pink-300",
  },
  {
    href: "/admin/deals",
    icon: "local_offer",
    label: "Deals",
    hint: "Promotions and discount codes",
    color: "text-amber-400",
  },
  {
    href: "/admin/updates",
    icon: "campaign",
    label: "Updates",
    hint: "News and announcements",
    color: "text-blue-400",
  },
  {
    href: "/admin/products",
    icon: "inventory_2",
    label: "Products",
    hint: "Catalogue, prices, photos and stock",
    color: "text-purple-300",
  },
];

export default async function AdminSettingsPage() {
  const [saved, savedAlerts, adminEmail] = await Promise.all([
    getSavedContactRecipients(),
    getSavedAlertRecipients(),
    getAdminEmail(),
  ]);
  const envFallback = getEnvContactRecipients();

  return (
    <AdminShell adminEmail={adminEmail} title="Settings" subtitle="Site content and email">
      <div className="space-y-4">
        <Panel
          title="Order & payment alerts"
          hint={`Up to ${MAX_ORDER_ALERT_RECIPIENTS} addresses`}
          padded
        >
          <p className="mb-3 text-[11px] text-white/45">
            These addresses get an email for every <strong className="text-white/70">new order</strong> and
            every <strong className="text-white/70">successful payment</strong>. Super admins (
            {PROTECTED_SUPER_ADMIN_EMAILS.join(", ")}) always get them too. Customers get their own
            receipt and failed-payment emails separately.
          </p>
          <ContactRecipientsForm
            list="alerts"
            initial={savedAlerts}
            fallback={[...PROTECTED_SUPER_ADMIN_EMAILS]}
          />
        </Panel>

        <Panel title="Contact form emails" hint={`Up to ${MAX_CONTACT_RECIPIENTS} addresses`} padded>
          <p className="mb-3 text-[11px] text-white/45">
            Messages sent from the Contact page are emailed to these addresses. Every message
            is also kept in Communications → Inbox.
          </p>
          <ContactRecipientsForm initial={saved} fallback={envFallback} />
        </Panel>

        <Panel title="Site content" hint="What customers see" padded>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTENT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:border-purple-400/30 hover:bg-white/5"
              >
                <span className={`material-symbols-outlined text-lg ${link.color}`}>
                  {link.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-white">{link.label}</span>
                  <span className="block truncate text-[10px] text-white/40">{link.hint}</span>
                </span>
                <span className="material-symbols-outlined text-sm text-white/25">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
