"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

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
}

const PAGES: NavPage[] = [
  { href: "/admin", icon: "dashboard", label: "Overview" },
  { href: "/admin/orders", icon: "receipt_long", label: "All Orders" },
  { href: "/admin/products", icon: "inventory_2", label: "Products", color: "text-purple-300" },
  { href: "/admin/stats", icon: "bar_chart", label: "Statistics", color: "text-blue-400" },
  { href: "/admin/deals", icon: "local_offer", label: "Manage Deals", color: "text-amber-400" },
  { href: "/admin/updates", icon: "campaign", label: "Updates", color: "text-blue-400" },
  { href: "/admin/reviews", icon: "star", label: "Reviews", color: "text-amber-300" },
  {
    href: "/admin/transactions",
    icon: "check_circle",
    label: "Successful Payments",
    color: "text-green-400",
  },
  {
    href: "/admin/transactions/failed",
    icon: "cancel",
    label: "Failed Payments",
    color: "text-red-400",
  },
];

export default function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Longest matching href wins, so /admin/transactions/failed doesn't also
  // light up /admin/transactions.
  const activeHref = PAGES.map((p) => p.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white [color-scheme:dark]">
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
        <span className="w-7" />
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-44 flex-col border-r border-white/5 bg-zinc-950 transition-transform duration-300 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-white/5 px-3 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-400/30 bg-purple-400/15 text-[11px] font-black text-purple-300">
            K
          </span>
          <div>
            <p className="text-xs font-black leading-none text-white">Kelmon</p>
            <p className="mt-0.5 text-[8px] font-black uppercase tracking-widest text-purple-400/60">
              Admin Panel
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          <p className="mb-1.5 mt-1 px-2 text-[8px] font-black uppercase tracking-widest text-white/20">
            Navigation
          </p>
          {PAGES.map((page) => {
            const active = page.href === activeHref;
            return (
              <Link
                key={page.href}
                href={page.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? "bg-purple-600 text-white shadow shadow-purple-600/40"
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
                <span>{page.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-2 py-2">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-400/20">
              <span className="material-symbols-outlined text-xs text-purple-300">
                admin_panel_settings
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold leading-none text-white">
                {profile?.email ?? "Admin"}
              </p>
              <p className="mt-0.5 text-[8px] uppercase tracking-widest text-white/30">
                Administrator
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white/40 transition-all hover:bg-white/5 hover:text-purple-300"
          >
            <span className="material-symbols-outlined text-xs">open_in_new</span> View Site
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-red-400/60 transition-all hover:bg-red-500/5 hover:text-red-400"
          >
            <span className="material-symbols-outlined text-xs">logout</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Page body */}
      <div className="flex min-h-screen flex-col pt-11 md:pl-44 md:pt-0">
        <div className="sticky top-0 z-20 hidden items-center justify-between border-b border-white/5 bg-zinc-950 px-6 py-3 md:flex">
          <div>
            <h1 className="text-base font-black leading-none text-white">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
