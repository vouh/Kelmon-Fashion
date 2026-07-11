"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
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
  { href: "/salon", label: "Salon", key: "salon" },
];

export default function FloatingTopNav({ activeNav, cartCount = 0 }: FloatingTopNavProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <header className="fixed top-3 md:top-4 left-3 right-3 z-50">
      <div className="max-w-content mx-auto h-14 md:h-16 px-3 md:px-5 flex items-center justify-between gap-3 rounded-full bg-white/90 backdrop-blur-xl border border-primary/15 shadow-[0_8px_32px_rgba(142,68,173,0.12)]">
        <Link href="/" className="flex items-center gap-2 min-w-0 shrink-0 pl-1">
          <Image
            src={logo}
            alt="Kelmon"
            width={120}
            height={40}
            className="h-9 md:h-10 w-auto object-contain"
            priority
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
                    : "text-on-surface-variant hover:text-primary hover:bg-primary/8"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-0.5 shrink-0">
          {searchOpen ? (
            <form onSubmit={onSearch} role="search" className="flex items-center">
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setSearchOpen(false)}
                placeholder="Search..."
                className="w-36 md:w-48 h-9 px-4 rounded-full bg-primary/5 border border-primary/20 text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary"
              />
            </form>
          ) : (
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
          )}
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
  );
}
