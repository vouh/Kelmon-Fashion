import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Reveal from "@/components/ui/Reveal";
import HeroShowcase from "@/components/home/HeroShowcase";
import CircleCollection from "@/components/home/CircleCollection";
import SalonServicesSection from "@/components/home/SalonServicesSection";
import FeatureProductCard from "@/components/shop/FeatureProductCard";
import { shopProducts } from "@/lib/products";
import { salonServices } from "@/lib/salon";

const brandStrip = ["Chanel", "Dior", "Louis Vuitton", "Gucci", "YSL", "Prada", "Armani"];

export default function HomePage() {
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
              Our picks
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
                Shop the fits
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </Reveal>
        </section>

        <Reveal>
          <SalonServicesSection services={salonServices.slice(0, 3)} />
        </Reveal>
      </main>
    </AppShell>
  );
}
