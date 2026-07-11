import Link from "next/link";
import Image from "next/image";
import logo from "@/lib/logo";

export default function Footer() {
  return (
    <footer className="w-full mt-auto border-t border-primary/15 bg-white">
      <div className="px-margin-mobile md:px-margin-desktop py-10 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          <div className="sm:col-span-2 md:col-span-1 space-y-3">
            <Image src={logo} alt="Kelmon" width={140} height={48} className="h-12 w-auto object-contain" />
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
              Premium fashion & beauty for UoN campus — shop, salon, delivery.
            </p>
          </div>

          <div>
            <h3 className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-3">
              Products
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/shop" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  Shop all
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Bags" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  Bags
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Perfumes" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  Perfumes
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Fashion" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  Fashion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-3">
              Services
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/salon" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  Salon booking
                </Link>
              </li>
              <li>
                <Link href="/about" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/orders" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  Orders
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-3">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://wa.me/254700000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <Link href="/profile" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-primary/10 flex flex-col sm:flex-row justify-between gap-3">
          <p className="font-body-md text-body-md text-on-surface-variant">
            © 2026 Kelmon · Beauty · Fashion · Glamour
          </p>
          <p className="font-body-md text-body-md text-primary">
            Free campus delivery over KES 3,000
          </p>
        </div>
      </div>
    </footer>
  );
}
