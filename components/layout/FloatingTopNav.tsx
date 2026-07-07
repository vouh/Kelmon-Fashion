"use client";

import Link from "next/link";
import Image from "next/image";
import { useSidebar } from "@/components/providers/SidebarProvider";
import ThemeToggle from "@/components/layout/ThemeToggle";
import logo from "@/lib/logo";
import type { NavItem } from "@/lib/products";

interface FloatingTopNavProps {
  activeNav?: NavItem;
  cartCount?: number;
}

export default function FloatingTopNav({ activeNav, cartCount = 3 }: FloatingTopNavProps) {
  const { isOpen, isCollapsed, toggleOpen, toggleCollapsed } = useSidebar();

  return (
    <header
      className={`fixed top-3 md:top-4 z-50 transition-all duration-300 ease-in-out left-3 right-3 md:right-4 ${
        isOpen
          ? isCollapsed
            ? "md:left-[calc(72px+1rem)]"
            : "md:left-[calc(260px+1rem)]"
          : "md:left-4"
      }`}
    >
      <div className="max-w-content mx-auto h-14 px-3 md:px-5 flex items-center justify-between gap-3 rounded-2xl glass-panel shadow-lg border border-[var(--kelmon-border-subtle)] backdrop-blur-xl">
        {/* Left: menu + logo */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={toggleOpen}
            aria-label={isOpen ? "Hide sidebar" : "Show sidebar"}
            className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isOpen ? "menu_open" : "menu"}
            </span>
          </button>

          <button
            onClick={toggleOpen}
            aria-label="Toggle menu"
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>

          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image src={logo} alt="Kelmon" width={32} height={32} className="w-8 h-8 object-contain shrink-0 hidden sm:block" />
            <span className="font-display-md text-lg md:text-xl text-primary drop-shadow-[0_0_10px_rgba(236,178,255,0.4)] truncate">
              Kelmon
            </span>
          </Link>

          {isOpen && (
            <button
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-on-surface-variant hover:text-secondary transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isCollapsed ? "chevron_right" : "chevron_left"}
              </span>
            </button>
          )}
        </div>

        {/* Center: search (desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="search"
              placeholder="Search bags, perfumes, fashion..."
              className="w-full h-9 pl-10 pr-4 rounded-full bg-surface-container/60 border border-[var(--kelmon-border-default)] text-on-surface text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/50"
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <Link
            href="/cart"
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              activeNav === "cart"
                ? "text-secondary bg-surface-container-highest"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-highest"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary-container text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-semibold">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              activeNav === "profile"
                ? "text-secondary bg-surface-container-highest"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-highest"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
