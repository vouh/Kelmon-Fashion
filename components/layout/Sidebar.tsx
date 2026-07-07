"use client";

import Link from "next/link";
import Image from "next/image";
import { useSidebar } from "@/components/providers/SidebarProvider";
import logo from "@/lib/logo";
import type { NavItem } from "@/lib/products";

const navLinks: { href: string; label: string; icon: string; key: NavItem }[] = [
  { href: "/", label: "Home", icon: "home", key: "home" },
  { href: "/shop", label: "Shop", icon: "storefront", key: "shop" },
  { href: "/salon", label: "Salon", icon: "content_cut", key: "salon" },
  { href: "/orders", label: "My Orders", icon: "receipt_long", key: "orders" },
  { href: "/profile", label: "Profile", icon: "person", key: "profile" },
];

interface SidebarProps {
  active: NavItem;
}

export default function Sidebar({ active }: SidebarProps) {
  const { isOpen, isCollapsed, close } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed left-0 top-0 h-full z-40 bg-surface-container-high border-r border-secondary/20 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
          isOpen
            ? isCollapsed
              ? "w-[72px] translate-x-0"
              : "w-[260px] translate-x-0"
            : "-translate-x-full w-[260px]"
        } md:translate-x-0 ${!isOpen ? "md:-translate-x-full" : ""}`}
      >
        {/* Brand */}
        <div className={`pt-20 pb-6 px-4 flex flex-col items-center ${isCollapsed ? "px-2" : "px-6"}`}>
          <Link href="/" className="flex flex-col items-center gap-2">
            <Image
              src={logo}
              alt="Kelmon"
              width={isCollapsed ? 40 : 64}
              height={isCollapsed ? 40 : 64}
              className={`object-contain drop-shadow-[0_0_15px_rgba(236,178,255,0.4)] ${isCollapsed ? "w-10 h-10" : "w-16 h-16"}`}
            />
            {!isCollapsed && (
              <>
                <span className="font-display-md text-display-md text-primary drop-shadow-[0_0_15px_rgba(236,178,255,0.6)]">
                  Kelmon
                </span>
                <span className="font-label-caps text-label-caps text-secondary tracking-widest uppercase text-center">
                  BEAUTY • FASHION • GLAMOUR
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Nav links */}
        <ul className={`flex flex-col gap-1 flex-grow px-2 ${isCollapsed ? "px-2" : "px-4"}`}>
          {navLinks.map(({ href, label, icon, key }) => {
            const isActive = active === key;
            return (
              <li key={key}>
                <Link
                  href={href}
                  title={isCollapsed ? label : undefined}
                  onClick={() => {
                    if (window.innerWidth < 768) close();
                  }}
                  className={`flex items-center gap-3 py-3 rounded-lg transition-colors ${
                    isCollapsed ? "justify-center px-2" : "px-4"
                  } ${
                    isActive
                      ? "text-secondary font-bold bg-surface-container-highest border-l-2 border-secondary"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
                  }`}
                >
                  <span
                    className="material-symbols-outlined shrink-0"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {icon}
                  </span>
                  {!isCollapsed && <span className="font-body-lg text-body-lg truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer tagline when collapsed */}
        {isCollapsed && (
          <div className="pb-6 flex justify-center">
            <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              diamond
            </span>
          </div>
        )}
      </nav>
    </>
  );
}
