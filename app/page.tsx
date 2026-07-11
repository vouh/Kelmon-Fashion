import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import ProductCard from "@/components/shop/ProductCard";
import Reveal from "@/components/ui/Reveal";
import HeroShowcase from "@/components/home/HeroShowcase";
import CircleCollection from "@/components/home/CircleCollection";
import { shopProducts, formatKes } from "@/lib/products";
import { salonServices } from "@/lib/salon";

export default function HomePage() {
  const featuredSalon = salonServices.slice(0, 3);

  return (
    <AppShell activeNav="home">
      <main className="flex-grow">
        <HeroShowcase products={shopProducts.slice(0, 6)} />

        <Reveal>
          <CircleCollection products={shopProducts} />
        </Reveal>

        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <Reveal>
            <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
              <div>
                <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-2">
                  Products
                </p>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Shop bestsellers</h2>
              </div>
              <Link
                href="/shop"
                className="inline-flex h-11 px-6 rounded-full btn-primary text-white font-button-text text-button-text items-center gap-2 shrink-0"
              >
                View all products
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {shopProducts.slice(0, 8).map((product, i) => (
              <Reveal key={product.id} delay={(i % 4) * 60}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <Reveal>
            <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredSalon.map((service, i) => (
              <Reveal key={service.id} delay={i * 80}>
                <Link
                  href="/salon"
                  className="group block rounded-3xl overflow-hidden bg-surface border border-primary/20 hover:border-primary transition-colors"
                >
                  <div className="relative aspect-[4/3] bg-surface-container">
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
