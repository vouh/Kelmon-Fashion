import Link from "next/link";
import Image from "next/image";
import { logoOnDark } from "@/lib/logo";

export default function Footer() {
  return (
    <footer className="w-full mt-auto bg-[#8E44AD] dark:bg-[#3b1a55] text-white">
      <div className="px-margin-mobile md:px-margin-desktop pt-16 md:pt-20 pb-12 md:pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          <div className="sm:col-span-2 md:col-span-1 space-y-4">
            <Image
              src={logoOnDark}
              alt="Kelmon"
              width={200}
              height={80}
              className="h-14 md:h-16 w-auto object-contain"
              unoptimized
            />
            <p className="font-body-md text-body-md text-white/80 max-w-xs leading-relaxed">
              Beauty · Fashion · Glam — for youth who show up and get it dropped.
            </p>
          </div>

          <div>
            <h3 className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-4">
              Products
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/shop" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Shop all
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Bags" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Bags
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Perfumes" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Perfumes
                </Link>
              </li>
              <li>
                <Link href="/shop?category=Fashion" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Fashion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/salon" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Salon booking
                </Link>
              </li>
              <li>
                <Link href="/orders" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Orders
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Contact us
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/254700000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body-md text-body-md text-white/80 hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <Link href="/profile" className="font-body-md text-body-md text-white/80 hover:text-white transition-colors">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 md:mt-16 pt-8 border-t border-white/20 flex flex-col sm:flex-row justify-between gap-3">
          <p className="font-body-md text-body-md text-white/70">
            © 2026 Kelmon · Beauty · Fashion · Glamour
          </p>
          <p className="font-body-md text-body-md text-secondary">
            Free delivery over KES 3,000
          </p>
        </div>
      </div>
    </footer>
  );
}
