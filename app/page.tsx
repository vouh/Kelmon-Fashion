import AppShell from "@/components/layout/AppShell";
import Reveal from "@/components/ui/Reveal";
import HeroShowcase from "@/components/home/HeroShowcase";
import CircleCollection from "@/components/home/CircleCollection";
import { shopProducts } from "@/lib/products";

export default function HomePage() {
  return (
    <AppShell activeNav="home">
      <main className="flex-grow">
        <HeroShowcase products={shopProducts.slice(0, 6)} />
        <Reveal>
          <CircleCollection products={shopProducts} />
        </Reveal>
      </main>
    </AppShell>
  );
}
