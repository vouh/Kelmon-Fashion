import Link from "next/link";
import type { NavItem } from "@/lib/products";

/** Primary mobile destinations only — unfinished features live elsewhere. */
const navItems: { href: string; label: string; icon: string; key: NavItem }[] = [
  { href: "/", label: "Home", icon: "home", key: "home" },
  { href: "/shop", label: "Shop", icon: "storefront", key: "shop" },
  { href: "/cart", label: "Cart", icon: "shopping_cart", key: "cart" },
  { href: "/profile", label: "Me", icon: "person", key: "profile" },
];

interface BottomNavProps {
  active: NavItem;
  cartCount?: number;
}

export default function BottomNav({ active, cartCount = 0 }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-3 left-3 right-3 z-50 flex justify-around items-center px-4 py-3 rounded-full bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(142,68,173,0.15)] border border-primary/15"
      aria-label="Primary"
    >
      {navItems.map(({ href, label, icon, key }) => {
        const isActive = active === key || (key === "profile" && active === "orders");
        return (
          <Link
            key={key}
            href={href}
            className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] transition-transform ${
              isActive ? "text-primary scale-110" : "text-on-surface-variant hover:text-primary active:scale-90"
            }`}
          >
            <span
              className="material-symbols-outlined relative"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
              {key === "cart" && cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
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
