import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Reveal from "@/components/ui/Reveal";
import FullScreenHeroBanners from "@/components/home/FullScreenHeroBanners";
import CircleCollection from "@/components/home/CircleCollection";
import FeatureProductCard from "@/components/shop/FeatureProductCard";
import { getProducts } from "@/lib/supabase/products";
import { getHomepageDrops } from "@/lib/supabase/content";
import { pageMetadata } from "@/lib/seo";
import { roundRobinByCategory } from "@/lib/mix-products";
import { MAX_HOMEPAGE_DROPS } from "@/lib/homepage-drops";

export const metadata = pageMetadata({
  title: "Campus Fashion, Perfumes & Bags",
  description:
    "Kelmon brings campus fashion and beauty to Kenyan students: new-drop handbags, signature perfumes, men's colognes and accessories, delivered to your campus.",
  path: "/home",
});

const brandStrip = ["Chanel", "Dior", "Louis Vuitton", "Gucci", "YSL", "Prada", "Armani"];

export default async function HomePage() {
  const [shopProducts, homepageDrops] = await Promise.all([getProducts(), getHomepageDrops()]);

  // "Just Dropped" shows exactly the admin's Homepage Drops list, in its order.
  // Only when none are set does it fall back to a mix from the shop, so the
  // section is never empty.
  const linked = new Set(homepageDrops.map((drop) => drop.product_id).filter(Boolean));
  const topUp =
    homepageDrops.length > 0
      ? []
      : roundRobinByCategory(shopProducts, "circles").slice(0, MAX_HOMEPAGE_DROPS);
  const circleItems = homepageDrops.length > 0 ? homepageDrops.slice(0, MAX_HOMEPAGE_DROPS) : topUp;

  // Picks skip what the circles already show, unless that would leave the grid short.
  const shown = new Set([...linked, ...topUp.map((product) => product.id)]);
  const unseen = shopProducts.filter((product) => !shown.has(product.id));
  const gridProducts = roundRobinByCategory(unseen.length >= 8 ? unseen : shopProducts, "picks").slice(0, 8);

  return (
    <AppShell activeNav="home" underNav>
      <main className="flex-grow bg-background">
        <FullScreenHeroBanners />

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
          <CircleCollection products={circleItems} />
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
                See all products
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
    </AppShell>
  );
}
