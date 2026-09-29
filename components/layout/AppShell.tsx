"use client";

import AdminReturnBar from "@/components/layout/AdminReturnBar";
import BottomNav from "@/components/layout/BottomNav";
import FloatingTopNav from "@/components/layout/FloatingTopNav";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/components/providers/CartProvider";
import type { NavItem } from "@/lib/products";

interface AppShellProps {
  children: React.ReactNode;
  /** Omit on pages that aren't a nav destination (e.g. the legal pages). */
  activeNav?: NavItem;
  hideBottomNav?: boolean;
  /** Content starts at the very top, under the floating nav (e.g. a full-bleed hero). */
  underNav?: boolean;
}

export default function AppShell({
  children,
  activeNav,
  hideBottomNav = false,
  underNav = false,
}: AppShellProps) {
  const { itemCount } = useCart();

  return (
    <>
      <FloatingTopNav activeNav={activeNav} cartCount={itemCount} />
      <div
        className={`flex-grow min-h-screen flex flex-col ${underNav ? "" : "pt-[4.75rem] md:pt-[5.5rem]"}`}
      >
        {children}
        <Footer />
      </div>
      <AdminReturnBar />
      {!hideBottomNav && <BottomNav active={activeNav} cartCount={itemCount} />}
    </>
  );
}
