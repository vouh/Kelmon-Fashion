import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import MobileHeader from "@/components/layout/MobileHeader";
import Footer from "@/components/layout/Footer";
import type { NavItem } from "@/lib/products";

interface AppShellProps {
  children: React.ReactNode;
  activeNav: NavItem;
  cartCount?: number;
  hideBottomNav?: boolean;
}

export default function AppShell({ children, activeNav, cartCount = 3, hideBottomNav = false }: AppShellProps) {
  return (
    <>
      <MobileHeader />
      <Sidebar active={activeNav} />
      <div className="flex-grow pb-24 md:pb-0 md:ml-64 md:pt-0 min-h-screen flex flex-col">
        {children}
        <Footer />
      </div>
      {!hideBottomNav && <BottomNav active={activeNav} cartCount={cartCount} />}
    </>
  );
}
