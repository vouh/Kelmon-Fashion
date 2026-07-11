"use client";

import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import FloatingTopNav from "@/components/layout/FloatingTopNav";
import Footer from "@/components/layout/Footer";
import { useSidebar } from "@/components/providers/SidebarProvider";
import { useCart } from "@/components/providers/CartProvider";
import type { NavItem } from "@/lib/products";

interface AppShellProps {
  children: React.ReactNode;
  activeNav: NavItem;
  hideBottomNav?: boolean;
}

export default function AppShell({ children, activeNav, hideBottomNav = false }: AppShellProps) {
  const { isOpen } = useSidebar();
  const { itemCount } = useCart();

  return (
    <>
      <FloatingTopNav activeNav={activeNav} cartCount={itemCount} />
      <Sidebar active={activeNav} />
      <div
        className={`flex-grow pb-28 md:pb-0 min-h-screen flex flex-col transition-all duration-300 ease-in-out pt-[4.5rem] md:pt-[5rem] ${
          isOpen ? "md:ml-[280px]" : ""
        }`}
      >
        {children}
        <Footer />
      </div>
      {!hideBottomNav && <BottomNav active={activeNav} cartCount={itemCount} />}
    </>
  );
}
