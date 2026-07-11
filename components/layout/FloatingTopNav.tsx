"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SearchOverlay from "@/components/layout/SearchOverlay";
import logo from "@/lib/logo";
import type { NavItem } from "@/lib/products";

interface FloatingTopNavProps {
  activeNav?: NavItem;
  cartCount?: number;
}

const navLinks: { href: string; label: string; key: NavItem }[] = [
  { href: "/", label: "Home", key: "home" },
  { href: "/shop", label: "Shop", key: "shop" },
  { href: "/about", label: "About", key: "about" },
  { href: "/contact", label: "Contact", key: "contact" },
];

export default function FloatingTopNav({ activeNav, cartCount = 0 }: FloatingTopNavProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="fixed top-3 md:top-4 left-3 right-3 z-50">
        <div className="max-w-content mx-auto h-16 md:h-[4.5rem] pl-2 pr-2 md:pl-3 md:pr-4 flex items-center justify-between gap-3 rounded-full bg-white/90 dark:bg-[#1a0f22]/90 backdrop-blur-xl border border-primary/20 shadow-[0_8px_32px_rgba(142,68,173,0.15)]">
          <Link href="/" className="shrink-0 flex items-center overflow-visible" aria-label="Kelmon home">
            <Image
              src={logo}
              alt="Kelmon"
              width={200}
              height={70}
              className="h-12 md:h-14 w-auto max-w-[200px] object-contain"
              style={{ width: "auto", background: "transparent" }}
              priority
              unoptimized
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {navLinks.map(({ href, label, key }) => {
              const active = activeNav === key;
              return (
                <Link
                  key={key}
                  href={href}
                  className={`px-4 py-2 rounded-full font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "text-on-surface-variant hover:text-primary hover:bg-primary/10"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                search
              </span>
            </button>
            <ThemeToggle />
            <Link
              href="/cart"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                activeNav === "cart"
                  ? "bg-primary text-white"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                shopping_cart
              </span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-secondary text-black text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                activeNav === "profile"
                  ? "bg-primary text-white"
                  : "text-primary hover:bg-primary/10"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                account_circle
              </span>
            </Link>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
