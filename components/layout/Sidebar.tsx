"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/providers/SidebarProvider";
import logo from "@/lib/logo";
import type { NavItem } from "@/lib/products";

const SIDEBAR_WIDTH = 280;

const primaryLinks: { href: string; label: string; icon: string; key: NavItem }[] = [
  { href: "/", label: "Home", icon: "home", key: "home" },
  { href: "/shop", label: "Shop", icon: "storefront", key: "shop" },
  { href: "/orders", label: "Orders", icon: "receipt_long", key: "orders" },
  { href: "/profile", label: "Profile", icon: "person", key: "profile" },
];

interface SidebarProps {
  active: NavItem;
}

export default function Sidebar({ active }: SidebarProps) {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Sidebar"
        aria-hidden={!isOpen}
        style={{ width: SIDEBAR_WIDTH }}
        className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-transform duration-300 ease-out bg-[var(--theme-surface-container-lowest)] border-r border-white/[0.06] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="px-5 pt-[4.75rem] pb-6 border-b border-white/[0.06]">
          <Link
            href="/"
            onClick={() => window.innerWidth < 768 && close()}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-container/15 border border-primary-container/25 flex items-center justify-center shrink-0">
              <Image src={logo} alt="" width={28} height={28} className="w-7 h-7 object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block font-display-md text-lg text-on-surface leading-tight">Kelmon</span>
              <span className="block text-[11px] text-on-surface-variant tracking-wide truncate">
                Campus fashion & beauty
              </span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <ul className="flex flex-col gap-1 p-3 flex-grow">
          {primaryLinks.map(({ href, label, icon, key }) => {
            const isActive = active === key || (key !== "home" && pathname.startsWith(href) && href !== "/");
            return (
              <li key={key}>
                <Link
                  href={href}
                  onClick={() => window.innerWidth < 768 && close()}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary-container/15 text-primary border border-primary-container/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary-container/25 text-primary" : "bg-white/[0.03] text-on-surface-variant"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {icon}
                    </span>
                  </span>
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer card */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="rounded-xl p-4 bg-gradient-to-br from-primary-container/10 to-transparent border border-primary-container/15">
            <p className="text-sm font-semibold text-on-surface mb-1">Salon booking</p>
            <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
              On-campus glam — opening soon.
            </p>
            <Link
              href="/salon"
              onClick={() => window.innerWidth < 768 && close()}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            >
              Get notified
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

export { SIDEBAR_WIDTH };
