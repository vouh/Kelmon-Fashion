import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import ProductCard from "@/components/shop/ProductCard";
import logo from "@/lib/logo";
import { categories, featuredProducts } from "@/lib/products";

export default function HomePage() {
  return (
    <AppShell activeNav="home">
      <main className="flex-grow">
        {/* Hero */}
        <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-xl overflow-hidden radial-glow-hero border-b border-white/5">
          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
            <div className="w-48 md:w-64 mb-8 drop-shadow-[0_0_30px_rgba(142,68,173,0.4)]">
              <Image src={logo} alt="Kelmon Logo" width={256} height={256} className="w-full h-auto object-contain" priority />
            </div>
            <h2 className="font-label-caps text-label-caps text-secondary tracking-widest uppercase">
              BEAUTY • FASHION • GLAMOUR
            </h2>
            <p className="font-headline-lg text-headline-lg text-on-surface leading-snug">
              Premium fashion & beauty, delivered to your campus.
            </p>
            <Link
              href="/shop"
              className="mt-8 primary-gradient-btn text-white font-button-text text-button-text h-[48px] px-8 rounded-full inline-flex items-center justify-center gap-2"
            >
              Shop Now <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          <div className="absolute top-1/4 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-10 w-48 h-48 bg-secondary/5 rounded-full blur-3xl" />
        </section>

        {/* Promo & Categories */}
        <section className="px-margin-mobile md:px-margin-desktop py-lg space-y-xl">
          <div className="glass-card rounded-xl p-6 border-l-4 border-secondary flex items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-secondary/10 to-transparent" />
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_shipping
              </span>
            </div>
            <div>
              <h3 className="font-title-lg text-title-lg text-on-surface">Campus Delivery</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Free delivery to UoN Main Campus — orders over KES 3,000.
              </p>
            </div>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4">
            {categories.map((cat) => (
              <Link
                key={cat}
                href="/shop"
                className="flex-shrink-0 px-6 py-2 rounded-full bg-secondary/10 border border-secondary text-secondary font-label-caps text-label-caps uppercase tracking-wider hover:bg-secondary/20 transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="px-margin-mobile md:px-margin-desktop py-lg">
          <div className="flex justify-between items-end mb-8">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Trending on Campus</h2>
            <Link href="/shop" className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-wider">
              View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-6 pb-8 snap-x">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>

        {/* Salon Spotlight */}
        <section className="px-margin-mobile md:px-margin-desktop py-lg pb-12">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-8">Book Your Glam</h2>
          <div className="relative w-full rounded-2xl overflow-hidden elevated-dark hairline-gold min-h-[300px] flex items-center p-8 md:p-12">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAePHL9GQnb7lz12_hBLroNqeSznD5KtKv2XPN-6RE88sZgNFngL9Tks3VaBpmcWRt0itKH6bJ8HDLDK4Xn5TZpbR0qSDuRsPuaVLXXmP5qx-htLcVyCdXsrKY2UoSqtF20dmOf-L0fK4o-Cyu62oZLkHBxJbiN323Z_i2CO2bdqQ8oUmnPFh2IZQn97raYFrqd1-gwgrghDg4daVt13ocPc3SQq3q120Y-MS3E3o8dZrTJh_B9g9u5')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="relative z-10 max-w-lg space-y-4">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Gel Manicure</h3>
              <p className="font-title-lg text-title-lg text-secondary">from KES 1,500</p>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mt-2 mb-6">
                Professional salon services available right here on campus. Secure your slot today.
              </p>
              <Link
                href="/salon"
                className="inline-flex h-[48px] px-8 rounded-full border border-secondary text-secondary font-button-text text-button-text hover:bg-secondary hover:text-on-secondary transition-colors duration-300 items-center"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
