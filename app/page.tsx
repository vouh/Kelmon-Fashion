import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import ProductSlider from "@/components/shop/ProductSlider";
import logo from "@/lib/logo";
import { shopProducts, formatKes } from "@/lib/products";

const services = [
  {
    href: "/shop",
    icon: "shopping_bag",
    title: "Shop",
    description: "Bags, perfumes, fashion & nails delivered to campus.",
  },
  {
    href: "/salon",
    icon: "spa",
    title: "Salon",
    description: `Gel manicures and glam booking from ${formatKes(1500)}. Coming soon.`,
  },
  {
    href: "/cart",
    icon: "local_shipping",
    title: "Campus delivery",
    description: `Free delivery to UoN over ${formatKes(3000)}. M-Pesa or pay on delivery.`,
  },
];

export default function HomePage() {
  return (
    <AppShell activeNav="home">
      <main className="flex-grow">
        {/* Hero */}
        <section className="relative min-h-[68vh] md:min-h-[75vh] flex flex-col justify-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center landing-kenburns"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAePHL9GQnb7lz12_hBLroNqeSznD5KtKv2XPN-6RE88sZgNFngL9Tks3VaBpmcWRt0itKH6bJ8HDLDK4Xn5TZpbR0qSDuRsPuaVLXXmP5qx-htLcVyCdXsrKY2UoSqtF20dmOf-L0fK4o-Cyu62oZLkHBxJbiN323Z_i2CO2bdqQ8oUmnPFh2IZQn97raYFrqd1-gwgrghDg4daVt13ocPc3SQq3q120Y-MS3E3o8dZrTJh_B9g9u5')",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-primary/25" />

          <div className="relative z-10 px-margin-mobile md:px-margin-desktop py-xl max-w-3xl space-y-5">
            <div className="flex items-center gap-3 landing-fade" style={{ animationDelay: "0.1s" }}>
              <Image
                src={logo}
                alt=""
                width={52}
                height={52}
                className="w-[52px] h-[52px] object-contain"
                priority
              />
              <span className="font-display-md text-3xl md:text-4xl text-on-surface tracking-tight">
                Kelmon
              </span>
            </div>
            <h1
              className="font-headline-lg text-headline-lg md:text-display-md text-on-surface leading-snug landing-fade"
              style={{ animationDelay: "0.25s" }}
            >
              Premium glam to UoN.
            </h1>
            <p
              className="font-body-lg text-body-lg text-on-surface-variant max-w-md landing-fade"
              style={{ animationDelay: "0.4s" }}
            >
              Fashion & beauty for campus — shop, book, and get it delivered.
            </p>
            <div className="flex flex-wrap gap-3 landing-fade" style={{ animationDelay: "0.55s" }}>
              <Link
                href="/shop"
                className="inline-flex h-12 px-8 rounded-lg btn-primary text-white font-button-text text-button-text items-center gap-2"
              >
                Shop products
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/salon"
                className="inline-flex h-12 px-8 rounded-lg border border-primary/40 text-primary font-button-text text-button-text hover:bg-primary/10 transition-colors items-center"
              >
                View services
              </Link>
            </div>
          </div>
        </section>

        {/* Product slider */}
        <section className="px-margin-mobile md:px-margin-desktop py-xl">
          <div className="flex justify-between items-end mb-6 gap-4">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Featured products</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Swipe through this week&apos;s picks
              </p>
            </div>
            <Link
              href="/shop"
              className="font-label-caps text-label-caps text-primary hover:opacity-80 transition-opacity flex items-center gap-1 uppercase tracking-wider shrink-0"
            >
              Shop all
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <ProductSlider products={shopProducts} label="Featured products" />
        </section>

        {/* Products overview */}
        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">Products</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-lg">
            Curated fashion and beauty — bags, scents, nails, and campus style.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { name: "Bags", href: "/shop?category=Bags", icon: "work" },
              { name: "Perfumes", href: "/shop?category=Perfumes", icon: "air" },
              { name: "Fashion", href: "/shop?category=Fashion", icon: "checkroom" },
              { name: "Nails", href: "/shop?category=Nails", icon: "brush" },
            ].map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="group flex flex-col items-start gap-3 p-5 md:p-6 bg-surface-container border border-primary/15 hover:border-primary/40 transition-colors"
              >
                <span
                  className="material-symbols-outlined text-primary text-[28px]"
                  aria-hidden="true"
                >
                  {cat.icon}
                </span>
                <span className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">Services</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-lg">
            Everything you need for glam on campus — in one place.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="block p-6 md:p-8 bg-gradient-to-br from-primary/10 via-surface-container to-transparent border border-primary/15 hover:border-primary/35 transition-colors"
              >
                <span
                  className="material-symbols-outlined text-primary text-[32px] mb-4 block"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {service.icon}
                </span>
                <h3 className="font-title-lg text-title-lg text-on-surface mb-2">{service.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{service.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
