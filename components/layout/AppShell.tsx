"use client";

import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import FloatingTopNav from "@/components/layout/FloatingTopNav";
import Footer from "@/components/layout/Footer";
import { useSidebar } from "@/components/providers/SidebarProvider";
import type { NavItem } from "@/lib/products";

interface AppShellProps {
  children: React.ReactNode;
  activeNav: NavItem;
  cartCount?: number;
  hideBottomNav?: boolean;
}

export default function AppShell({ children, activeNav, cartCount = 3, hideBottomNav = false }: AppShellProps) {
  const { isOpen, isCollapsed } = useSidebar();

  const mainOffset = isOpen
    ? isCollapsed
      ? "md:ml-[72px]"
      : "md:ml-[260px]"
    : "md:ml-0";

  return (
    <>
      <FloatingTopNav activeNav={activeNav} cartCount={cartCount} />
      <Sidebar active={activeNav} />
      <div className={`flex-grow pb-28 md:pb-0 min-h-screen flex flex-col transition-all duration-300 ease-in-out pt-[4.5rem] md:pt-[5rem] ${mainOffset}`}>
        {children}
        <Footer />
      </div>
      {!hideBottomNav && <BottomNav active={activeNav} cartCount={cartCount} />}
    </>
  );
}
