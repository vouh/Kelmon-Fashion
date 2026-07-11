"use client";

import BottomNav from "@/components/layout/BottomNav";
import FloatingTopNav from "@/components/layout/FloatingTopNav";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/components/providers/CartProvider";
import type { NavItem } from "@/lib/products";

interface AppShellProps {
  children: React.ReactNode;
  activeNav: NavItem;
  hideBottomNav?: boolean;
}

export default function AppShell({ children, activeNav, hideBottomNav = false }: AppShellProps) {
  const { itemCount } = useCart();

  return (
    <>
      <FloatingTopNav activeNav={activeNav} cartCount={itemCount} />
      <div className="flex-grow pb-28 md:pb-0 min-h-screen flex flex-col pt-[4.75rem] md:pt-[5.5rem]">
        {children}
        <Footer />
      </div>
      {!hideBottomNav && <BottomNav active={activeNav} cartCount={itemCount} />}
    </>
  );
}
