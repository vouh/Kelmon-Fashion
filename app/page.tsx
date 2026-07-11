import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import ProductSlider from "@/components/shop/ProductSlider";
import ProductCard from "@/components/shop/ProductCard";
import Reveal from "@/components/ui/Reveal";
import NewsletterSignup from "@/components/home/NewsletterSignup";
import logo from "@/lib/logo";
import { categories, shopProducts, formatKes } from "@/lib/products";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAePHL9GQnb7lz12_hBLroNqeSznD5KtKv2XPN-6RE88sZgNFngL9Tks3VaBpmcWRt0itKH6bJ8HDLDK4Xn5TZpbR0qSDuRsPuaVLXXmP5qx-htLcVyCdXsrKY2UoSqtF20dmOf-L0fK4o-Cyu62oZLkHBxJbiN323Z_i2CO2bdqQ8oUmnPFh2IZQn97raYFrqd1-gwgrghDg4daVt13ocPc3SQq3q120Y-MS3E3o8dZrTJh_B9g9u5";

const marqueeItems = [
  "Free campus delivery over KES 3,000",
  "M-Pesa & pay on delivery",
  "100% authentic products",
  "Same-day UoN drop-off",
  "Salon booking coming soon",
];

const perks = [
  {
    icon: "local_shipping",
    title: "Campus delivery",
    description: "Same-day drop-off at UoN hostels and gates. Free over KES 3,000.",
  },
  {
    icon: "verified",
    title: "100% authentic",
    description: "Every bag, scent, and kit is sourced and checked — no fakes, ever.",
  },
  {
    icon: "account_balance_wallet",
    title: "M-Pesa checkout",
    description: "Pay with M-Pesa in seconds, or cash on delivery if you prefer.",
  },
  {
    icon: "spa",
    title: "Salon on campus",
    description: `Gel manicures from ${formatKes(1500)}. Booking slots open soon.`,
  },
];

const testimonials = [
  {
    name: "Wanjiku M.",
    campus: "UoN Main Campus",
    quote:
      "Ordered a perfume at noon, had it at my hostel by evening. The packaging alone felt premium.",
    rating: 5,
  },
  {
    name: "Achieng O.",
    campus: "Chiromo Campus",
    quote:
      "The crossbody bag is exactly like the photos. Paying with M-Pesa made it so easy.",
    rating: 5,
  },
  {
    name: "Faith K.",
    campus: "Lower Kabete",
    quote:
      "Finally a shop that actually delivers to campus. My gel kit arrived in perfect condition.",
    rating: 4,
  },
];

export default function HomePage() {
  const newArrivals = shopProducts.slice(0, 8);

  return (
    <AppShell activeNav="home">
      <main className="flex-grow">
        {/* Hero */}
        <section className="relative min-h-[82vh] flex flex-col justify-center overflow-hidden bg-black">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45 hero-zoom"
            style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

          <div className="relative z-10 px-margin-mobile md:px-margin-desktop py-xl max-w-4xl space-y-6">
            <div className="landing-fade" style={{ animationDelay: "0.1s" }}>
              <Image
                src={logo}
                alt="Kelmon"
                width={200}
                height={100}
                className="h-20 md:h-24 w-auto object-contain"
                priority
              />
            </div>
            <p
              className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.25em] landing-fade"
              style={{ animationDelay: "0.25s" }}
            >
              Beauty · Fashion · Glamour
            </p>
            <h1
              className="font-display-lg text-display-md md:text-display-lg text-white leading-tight landing-fade"
              style={{ animationDelay: "0.4s" }}
            >
              Premium glam,
              <br />
              delivered to campus.
            </h1>
            <p
              className="font-body-lg text-body-lg text-white/75 max-w-lg landing-fade"
              style={{ animationDelay: "0.55s" }}
            >
              Designer bags, signature scents, nails, and fashion — curated for UoN
              students and delivered to your hostel door.
            </p>
            <div className="flex flex-wrap gap-3 pt-2 landing-fade" style={{ animationDelay: "0.7s" }}>
              <Link
                href="/shop"
                className="inline-flex h-12 px-9 btn-primary text-white font-button-text text-button-text items-center gap-2"
              >
                Shop now
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/salon"
                className="inline-flex h-12 px-9 border border-white/40 text-white font-button-text text-button-text hover:border-secondary hover:text-secondary transition-colors items-center"
              >
                Explore services
              </Link>
            </div>

            <div
              className="flex flex-wrap gap-x-10 gap-y-4 pt-6 landing-fade"
              style={{ animationDelay: "0.85s" }}
            >
              {[
                { value: "500+", label: "Products" },
                { value: "24hr", label: "Delivery" },
                { value: "4.8★", label: "Avg. rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-headline-sm text-headline-sm text-secondary">{stat.value}</p>
                  <p className="font-label-caps text-label-caps text-white/60 uppercase tracking-wider mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Marquee strip */}
        <div className="bg-primary py-3 overflow-hidden" aria-hidden="true">
          <div className="marquee-track flex whitespace-nowrap w-max">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={i}
                className="font-label-caps text-label-caps text-white uppercase tracking-widest mx-8 flex items-center gap-8"
              >
                {item}
                <span className="material-symbols-outlined text-[10px]">fiber_manual_record</span>
              </span>
            ))}
          </div>
        </div>

        {/* Featured slider */}
        <section className="px-margin-mobile md:px-margin-desktop py-xl">
          <Reveal>
            <div className="flex justify-between items-end mb-6 gap-4">
              <div>
                <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
                  Handpicked
                </p>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Featured products</h2>
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
          </Reveal>
          <Reveal delay={120}>
            <ProductSlider products={shopProducts} label="Featured products" />
          </Reveal>
        </section>

        {/* Shop by category */}
        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <Reveal>
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
              Collections
            </p>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-6">Shop by category</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, i) => {
              const cover = shopProducts.find((p) => p.category === cat);
              return (
                <Reveal key={cat} delay={i * 90}>
                  <Link
                    href={`/shop?category=${encodeURIComponent(cat)}`}
                    className="group relative block aspect-[4/5] overflow-hidden border border-primary/25 hover:border-primary transition-colors bg-surface-container"
                  >
                    {cover && (
                      <Image
                        src={cover.image}
                        alt={cat}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/45 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="font-title-lg text-title-lg text-white">{cat}</h3>
                      <p className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mt-1 flex items-center gap-1">
                        Shop now
                        <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* New arrivals grid */}
        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <Reveal>
            <div className="flex justify-between items-end mb-6 gap-4">
              <div>
                <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
                  Just dropped
                </p>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">New arrivals</h2>
              </div>
              <Link
                href="/shop"
                className="font-label-caps text-label-caps text-primary hover:opacity-80 transition-opacity flex items-center gap-1 uppercase tracking-wider shrink-0"
              >
                View all
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newArrivals.map((product, i) => (
              <Reveal key={product.id} delay={(i % 4) * 80}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Perks */}
        <section className="bg-surface-container border-y border-primary/20">
          <div className="px-margin-mobile md:px-margin-desktop py-xl">
            <Reveal>
              <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
                Why Kelmon
              </p>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-8">
                Built for campus life
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {perks.map((perk, i) => (
                <Reveal key={perk.title} delay={i * 90}>
                  <div className="h-full p-6 bg-surface border border-primary/20 hover:border-primary transition-colors hover-lift">
                    <span
                      className="material-symbols-outlined text-primary text-[32px] mb-4 block"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      {perk.icon}
                    </span>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-2">{perk.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {perk.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-margin-mobile md:px-margin-desktop py-xl">
          <Reveal>
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
              Campus loves us
            </p>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-8">
              What students say
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <figure className="h-full p-6 md:p-8 bg-surface-container border border-primary/20 flex flex-col gap-4 hover-lift">
                  <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span
                        key={s}
                        className={`material-symbols-outlined text-base ${
                          s < t.rating ? "text-secondary" : "text-on-surface-variant/30"
                        }`}
                        style={s < t.rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        aria-hidden="true"
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <blockquote className="font-body-lg text-body-lg text-on-surface flex-grow">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption>
                    <p className="font-title-lg text-title-lg text-on-surface">{t.name}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">{t.campus}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Newsletter / CTA */}
        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <Reveal>
            <div className="bg-primary p-8 md:p-14 flex flex-col md:flex-row md:items-center gap-8 justify-between">
              <div className="max-w-xl space-y-3">
                <p className="font-label-caps text-label-caps text-white/70 uppercase tracking-widest">
                  Stay in the loop
                </p>
                <h2 className="font-headline-lg text-headline-lg text-white">
                  Get first dibs on new drops
                </h2>
                <p className="font-body-lg text-body-lg text-white/80">
                  Drop your number and we&apos;ll text you when fresh stock and salon slots land.
                </p>
              </div>
              <NewsletterSignup />
            </div>
          </Reveal>
        </section>
      </main>
    </AppShell>
  );
}
