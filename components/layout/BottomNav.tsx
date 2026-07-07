import Link from "next/link";
import type { NavItem } from "@/lib/products";

const navItems: { href: string; label: string; icon: string; key: NavItem }[] = [
  { href: "/", label: "Home", icon: "home", key: "home" },
  { href: "/shop", label: "Shop", icon: "storefront", key: "shop" },
  { href: "/salon", label: "Salon", icon: "content_cut", key: "salon" },
  { href: "/cart", label: "Cart", icon: "shopping_cart", key: "cart" },
  { href: "/profile", label: "Profile", icon: "person", key: "profile" },
];

interface BottomNavProps {
  active: NavItem;
  cartCount?: number;
}

export default function BottomNav({ active, cartCount = 0 }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface-container/80 backdrop-blur-2xl rounded-t-xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {navItems.map(({ href, label, icon, key }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={href}
            className={`flex flex-col items-center justify-center transition-transform ${
              isActive ? "text-secondary scale-110" : "text-on-surface-variant hover:text-primary active:scale-90"
            }`}
          >
            <span
              className="material-symbols-outlined relative"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
              {key === "cart" && cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary-container text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="font-label-caps text-[10px] mt-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
