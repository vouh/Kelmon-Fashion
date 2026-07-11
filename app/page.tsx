import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import Reveal from "@/components/ui/Reveal";
import HeroShowcase from "@/components/home/HeroShowcase";
import CircleCollection from "@/components/home/CircleCollection";
import FeatureProductCard from "@/components/shop/FeatureProductCard";
import { shopProducts, formatKes } from "@/lib/products";
import { salonServices } from "@/lib/salon";

const brandStrip = ["Chanel", "Dior", "Louis Vuitton", "Gucci", "YSL", "Prada", "Armani"];

export default function HomePage() {
  const featuredSalon = salonServices.slice(0, 3);
  const gridProducts = shopProducts.slice(0, 8);

  return (
    <AppShell activeNav="home">
      <main className="flex-grow bg-background">
        <HeroShowcase products={shopProducts.slice(0, 6)} />

        {/* Brand strip */}
        <div className="bg-primary py-4 overflow-hidden" aria-hidden="true">
          <div className="marquee-track flex whitespace-nowrap w-max">
            {[...brandStrip, ...brandStrip].map((brand, i) => (
              <span
                key={`${brand}-${i}`}
                className="font-label-caps text-label-caps text-white/90 uppercase tracking-[0.28em] mx-10"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>

        <Reveal>
          <CircleCollection products={shopProducts} />
        </Reveal>

        {/* Our Features — reference product grid */}
        <section className="px-6 md:px-12 lg:px-16 py-16 md:py-20 bg-[#f5f0f8] dark:bg-surface-dim">
          <Reveal>
            <h2 className="font-display-lg text-[1.75rem] md:text-[2.15rem] text-on-surface text-center tracking-tight mb-12 md:mb-14">
              Our Features
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12 md:gap-x-7 md:gap-y-14 max-w-[1100px] mx-auto">
            {gridProducts.map((product, i) => (
              <Reveal key={product.id} delay={(i % 4) * 40}>
                <FeatureProductCard product={product} />
              </Reveal>
            ))}
          </div>
          <Reveal delay={60}>
            <div className="flex justify-center mt-14">
              <Link
                href="/shop"
                className="inline-flex h-11 px-9 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-[0.18em] items-center gap-2 hover:bg-[#7a3a96] transition-colors"
              >
                Load more
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  refresh
                </span>
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Salon services — 3 with images */}
        <section className="px-margin-mobile md:px-margin-desktop py-xl bg-surface">
          <Reveal>
            <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
              <div>
                <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-2">
                  Services
                </p>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Salon on campus</h2>
              </div>
              <Link
                href="/salon"
                className="inline-flex h-11 px-6 rounded-full border border-primary text-primary font-button-text text-button-text items-center gap-2 hover:bg-primary/10 transition-colors shrink-0"
              >
                View more
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredSalon.map((service, i) => (
              <Reveal key={service.id} delay={i * 80}>
                <Link
                  href="/salon"
                  className="group block rounded-[1.5rem] overflow-hidden bg-surface-dim border border-primary/15 hover:border-primary transition-colors"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-1 group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-3 line-clamp-2">
                      {service.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="font-body-md text-body-md text-primary font-semibold">
                        {formatKes(service.price)}
                      </p>
                      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                        {service.duration}
                      </p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
