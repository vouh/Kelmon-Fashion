"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import adminLogoDark from "@/images/admin-logo-dark.png";
import adminLogoLight from "@/images/admin-logo-light.png";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import ThemeToggle from "@/components/layout/ThemeToggle";
import AdminSearch from "@/components/admin/AdminSearch";
import { useAdminBadges, type AdminBadges } from "@/components/admin/useAdminBadges";

/**
 * Admin sidebar, topbar and mobile drawer.
 *
 * React port of admin/admin-shell.js, which built this markup as a template
 * string and injected it into a placeholder div on every page. Rebranded from
 * EzyBite orange to Kelmon purple.
 */

interface NavPage {
  href: string;
  icon: string;
  label: string;
  /** Icon tint when the item is not active, mirroring the old `color` field. */
  color?: string;
  /** Which unread count, if any, shows as a badge on this item. */
  badge?: keyof AdminBadges;
  /** Hidden from admins who aren't super admins (the page itself also checks). */
  superAdminOnly?: boolean;
}

const PAGES: NavPage[] = [
  { href: "/admin", icon: "dashboard", label: "Overview" },
  { href: "/admin/orders", icon: "receipt_long", label: "All Orders" },
  { href: "/admin/products", icon: "inventory_2", label: "Products", color: "text-purple-300" },
  { href: "/admin/stats", icon: "bar_chart", label: "Statistics", color: "text-blue-400" },
  { href: "/admin/deals", icon: "local_offer", label: "Manage Deals", color: "text-amber-400" },
  { href: "/admin/updates", icon: "campaign", label: "Updates", color: "text-blue-400" },
  { href: "/admin/reviews", icon: "star", label: "Reviews", color: "text-amber-300" },
  { href: "/admin/transactions", icon: "payments", label: "Payments", color: "text-green-400" },
  { href: "/admin/accounts", icon: "group", label: "Accounts", color: "text-pink-300", superAdminOnly: true },
  {
    href: "/admin/notifications",
    icon: "notifications",
    label: "Notifications",
    color: "text-amber-300",
    badge: "notifications",
  },
  {
    href: "/admin/communications",
    icon: "forum",
    label: "Communications",
    color: "text-blue-400",
    badge: "messages",
  },
  { href: "/admin/settings", icon: "settings", label: "Settings", color: "text-white/60" },
];

export default function AdminShell({
  children,
  title,
  subtitle,
  actions,
  adminEmail,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Passed from the server, so the header has a name before the profile loads. */
  adminEmail?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isSuperAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const badges = useAdminBadges(pathname);

  const email = profile?.email ?? adminEmail ?? "Admin";
  const roleLabel = isSuperAdmin ? "Super Admin" : "Administrator";

  /** Ends the Firebase session and clears the server cookie, then goes home. */
  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Already signed out, or Firebase unconfigured. Leaving is still correct.
    }
    router.push("/");
    router.refresh();
  }

  // Longest matching href wins, so a nested page lights up its own item
  // rather than its parent's.
  const activeHref = PAGES.map((p) => p.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div
      className="kelmon-admin min-h-screen"
      style={{
        "--admin-sidebar-width": sidebarCollapsed ? "4rem" : "11rem",
      } as CSSProperties}
    >
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile topbar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-11 items-center justify-between border-b border-white/5 bg-zinc-900 px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:text-white"
        >
          <span className="material-symbols-outlined text-lg">menu</span>
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
          {title}
        </span>
        <div className="flex items-center gap-1">
          <AdminSearch superAdmin={isSuperAdmin} variant="mobile" />
          <Link
            href="/profile"
            aria-label="Open user dashboard"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-purple-300 hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">switch_account</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-44 flex-col border-r border-white/5 bg-zinc-950 transition-[transform,width] duration-300 md:!w-[var(--admin-sidebar-width)] md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex items-center gap-2.5 border-b border-white/5 px-3 py-3 ${sidebarCollapsed ? "md:justify-center" : ""}`}>
          <Link href="/admin" aria-label="Kelmon admin home" className="flex min-w-0 flex-col items-start">
            {/* Collapsed sidebar: the bottle mark; expanded: the full wordmark. */}
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={32}
              height={32}
              className={`h-8 w-8 rounded-lg ${sidebarCollapsed ? "md:block" : "md:hidden"} hidden`}
            />
            <span className={`block ${sidebarCollapsed ? "md:hidden" : ""}`}>
              <Image src={adminLogoLight} alt="Kelmon" className="h-10 w-auto dark:hidden" priority />
              <Image src={adminLogoDark} alt="Kelmon" className="hidden h-10 w-auto dark:block" priority />
              <span className="mt-1 block text-[8px] font-black uppercase tracking-widest text-purple-400/70">
                Admin Panel
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          <p className={`mb-1.5 mt-1 px-2 text-[8px] font-black uppercase tracking-widest text-white/20 ${sidebarCollapsed ? "md:hidden" : ""}`}>
            Navigation
          </p>
          {PAGES.filter((page) => !page.superAdminOnly || isSuperAdmin).map((page) => {
            const active = page.href === activeHref;
            return (
              <Link
                key={page.href}
                href={page.href}
                onClick={() => setOpen(false)}
                className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                  sidebarCollapsed ? "md:justify-center" : ""
                } ${
                  active
                    ? "admin-active bg-purple-600 text-white shadow shadow-purple-600/40"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-sm ${
                    active ? "text-white" : (page.color ?? "text-white/50")
                  }`}
                >
                  {page.icon}
                </span>
                <span className={sidebarCollapsed ? "md:hidden" : ""}>{page.label}</span>
                {page.badge && badges[page.badge] > 0 && (
                  <span
                    className={`ml-auto min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-black leading-4 text-white ${
                      sidebarCollapsed ? "md:absolute md:right-1 md:top-0.5 md:ml-0" : ""
                    }`}
                  >
                    {badges[page.badge] > 99 ? "99+" : badges[page.badge]}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-2 py-2">
          <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${sidebarCollapsed ? "md:justify-center" : ""}`}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-400/20">
              <span className="material-symbols-outlined text-xs text-purple-300">
                admin_panel_settings
              </span>
            </div>
            <div className={`min-w-0 ${sidebarCollapsed ? "md:hidden" : ""}`}>
              <p className="truncate text-[10px] font-bold leading-none text-white">
                {email}
              </p>
              <p className="mt-0.5 text-[8px] uppercase tracking-widest text-white/30">
                {roleLabel}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className={`mt-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white/40 transition-all hover:bg-white/5 hover:text-purple-300 ${sidebarCollapsed ? "md:justify-center" : ""}`}
            title="View site"
          >
            <span className="material-symbols-outlined text-xs">open_in_new</span>
            <span className={sidebarCollapsed ? "md:hidden" : ""}>View Site</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className={`mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-red-400/60 transition-all hover:bg-red-500/5 hover:text-red-400 ${sidebarCollapsed ? "md:justify-center" : ""}`}
            title="Sign out"
          >
            <span className="material-symbols-outlined text-xs">logout</span>
            <span className={sidebarCollapsed ? "md:hidden" : ""}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Page body */}
      <div className="flex min-h-screen flex-col pt-11 md:!pl-[var(--admin-sidebar-width)] md:pt-0 transition-[padding] duration-300">
        <div className="admin-command-bar sticky top-0 z-20 hidden h-[68px] items-center border-b px-6 md:flex">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="admin-command-icon"
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              <span className="material-symbols-outlined text-xl">
                {sidebarCollapsed ? "menu" : "menu_open"}
              </span>
            </button>
            <AdminSearch superAdmin={isSuperAdmin} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {actions}
            <div className="relative">
              <button
                type="button"
                className="admin-workspace"
                aria-label="Switch workspace"
                aria-expanded={workspaceOpen}
                aria-haspopup="menu"
                onClick={() => setWorkspaceOpen((value) => !value)}
              >
                <span className="min-w-0 text-left">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-[#c5a059]">Workspace</span>
                  <span className="block truncate text-xs font-extrabold text-white">Admin dashboard</span>
                </span>
                <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
              {workspaceOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-xl border border-[var(--kelmon-border-default)] bg-[var(--kelmon-bg-elevated)] p-1.5 shadow-xl"
                >
                  <Link
                    href="/admin"
                    role="menuitem"
                    onClick={() => setWorkspaceOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-[var(--kelmon-text-primary)] transition-colors hover:bg-[var(--kelmon-purple-muted)]"
                  >
                    <span className="material-symbols-outlined text-base text-primary">admin_panel_settings</span>
                    <span>
                      <span className="block">Admin dashboard</span>
                      <span className="mt-0.5 block text-[10px] font-medium text-[var(--kelmon-text-secondary)]">Orders, products and payments</span>
                    </span>
                  </Link>
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setWorkspaceOpen(false)}
                    className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-[var(--kelmon-text-primary)] transition-colors hover:bg-[var(--kelmon-purple-muted)]"
                  >
                    <span className="material-symbols-outlined text-base text-primary">person</span>
                    <span>
                      <span className="block">User dashboard</span>
                      <span className="mt-0.5 block text-[10px] font-medium text-[var(--kelmon-text-secondary)]">Profile, orders and account</span>
                    </span>
                  </Link>
                </div>
              ) : null}
            </div>
            <Link
              href="/admin/notifications"
              aria-label={
                badges.notifications
                  ? `Notifications, ${badges.notifications} unread`
                  : "Notifications"
              }
              title="Notifications"
              className="admin-command-icon relative"
            >
              <span className="material-symbols-outlined text-xl">
                {badges.notifications ? "notifications_active" : "notifications"}
              </span>
              {badges.notifications > 0 && (
                <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-[18px] text-white shadow ring-2 ring-[var(--kelmon-bg-page,#18181b)]">
                  {badges.notifications > 99 ? "99+" : `+${badges.notifications}`}
                </span>
              )}
            </Link>
            <span className="h-7 w-px bg-[var(--kelmon-border-default)]" />
            <ThemeToggle />
            <span className="h-7 w-px bg-[var(--kelmon-border-default)]" />
            <div className="flex items-center gap-2.5 pr-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                {email.slice(0, 1).toUpperCase()}
              </div>
              <div className="max-w-[145px]">
                <p className="truncate text-xs font-black text-white">{email}</p>
                <p className="truncate text-[10px] text-white/50">{roleLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="admin-signout"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Sign out
            </button>
          </div>
        </div>

        <main className="flex-1 space-y-6 p-4 md:p-6">
          <div className="hidden md:block">
            <h1 className="text-xl font-black text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-xs font-medium text-white/50">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
