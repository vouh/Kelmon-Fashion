"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useSidebar } from "@/components/providers/SidebarProvider";
import SidebarToggle from "@/components/layout/SidebarToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";
import logo from "@/lib/logo";
import type { NavItem } from "@/lib/products";

interface FloatingTopNavProps {
  activeNav?: NavItem;
  cartCount?: number;
}

export default function FloatingTopNav({ activeNav, cartCount = 0 }: FloatingTopNavProps) {
  const { isOpen } = useSidebar();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <header
      className={`fixed top-3 md:top-4 z-50 transition-all duration-300 ease-in-out left-3 right-3 md:right-4 ${
        isOpen ? "md:ml-[280px]" : ""
      }`}
    >
      <div className="max-w-content mx-auto h-14 px-3 md:px-5 flex items-center justify-between gap-3 rounded-2xl glass-panel border border-[var(--kelmon-border-subtle)] backdrop-blur-xl">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <SidebarToggle />

          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image src={logo} alt="Kelmon" width={32} height={32} className="w-8 h-8 object-contain shrink-0 hidden sm:block" />
            <span className="font-display-md text-lg md:text-xl text-primary truncate">Kelmon</span>
          </Link>
        </div>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md mx-4" role="search">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" aria-hidden="true">
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bags, perfumes, fashion..."
              className="w-full h-9 pl-10 pr-4 rounded-full bg-surface-container/60 border border-[var(--kelmon-border-default)] text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/40"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <Link
            href="/cart"
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              activeNav === "cart"
                ? "text-secondary bg-surface-container-highest"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-highest"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary-container text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-semibold">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              activeNav === "profile"
                ? "text-secondary bg-surface-container-highest"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-highest"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">account_circle</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
