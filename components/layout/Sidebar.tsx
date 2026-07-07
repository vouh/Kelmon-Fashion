import Link from "next/link";
import type { NavItem } from "@/lib/products";

const navLinks: { href: string; label: string; icon: string; key: NavItem }[] = [
  { href: "/", label: "Home", icon: "home", key: "home" },
  { href: "/shop", label: "Shop", icon: "storefront", key: "shop" },
  { href: "/salon", label: "Salon", icon: "content_cut", key: "salon" },
  { href: "/orders", label: "My Orders", icon: "receipt_long", key: "orders" },
  { href: "/profile", label: "Profile", icon: "person", key: "profile" },
];

interface SidebarProps {
  active: NavItem;
}

export default function Sidebar({ active }: SidebarProps) {
  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full z-40 bg-surface-container-high border-r border-secondary/20 shadow-2xl w-64 pt-24 pb-8 px-6">
      <div className="mb-12">
        <Link href="/" className="font-display-md text-display-md text-primary drop-shadow-[0_0_15px_rgba(236,178,255,0.6)]">
          Kelmon
        </Link>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">Campus Premium</p>
      </div>
      <ul className="flex flex-col gap-2 flex-grow">
        {navLinks.map(({ href, label, icon, key }) => {
          const isActive = active === key;
          return (
            <li key={key}>
              <Link
                href={href}
                className={`flex items-center gap-4 py-3 px-4 rounded-lg transition-colors ${
                  isActive
                    ? "text-secondary font-bold border-r-2 border-secondary bg-surface-container-highest"
                    : "text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {icon}
                </span>
                <span className="font-body-lg text-body-lg">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
