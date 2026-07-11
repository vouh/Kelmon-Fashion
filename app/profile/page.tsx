import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export default function ProfilePage() {
  return (
    <AppShell activeNav="profile">
      <main className="flex-1 px-margin-mobile md:px-margin-desktop py-lg max-w-xl">
        <h1 className="font-display-md text-display-md text-on-surface mb-4">Profile</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
          Accounts aren’t live yet. You can still shop as a guest — cart and orders stay on this device.
        </p>
        <ul className="space-y-3">
          <li>
            <Link
              href="/orders"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-white/10 hover:border-secondary/40 transition-colors"
            >
              <span className="font-title-lg text-base text-on-surface">My Orders</span>
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
            </Link>
          </li>
          <li>
            <Link
              href="/cart"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-white/10 hover:border-secondary/40 transition-colors"
            >
              <span className="font-title-lg text-base text-on-surface">My Cart</span>
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
            </Link>
          </li>
          <li>
            <Link
              href="/salon"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-white/10 hover:border-secondary/40 transition-colors"
            >
              <span className="font-title-lg text-base text-on-surface">Salon waitlist</span>
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
            </Link>
          </li>
        </ul>
      </main>
    </AppShell>
  );
}
