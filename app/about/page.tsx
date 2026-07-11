import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import FaqSection from "@/components/home/FaqSection";
import { shopProducts, formatKes } from "@/lib/products";

const whyPoints = [
  "Authentic products that stay with you all day.",
  "Curated from trusted designers and suppliers.",
  "Every order is checked and packaged with care.",
  "Delivery that fits your campus timetable.",
];

export default function AboutPage() {
  const aboutImage =
    shopProducts.find((p) => p.category === "Perfumes")?.image ?? shopProducts[0].image;
  const faqImage =
    shopProducts.find((p) => p.category === "Fashion")?.image ?? shopProducts[0].image;

  return (
    <AppShell activeNav="about">
      <main className="flex-grow">
        <section className="px-margin-mobile md:px-margin-desktop pt-8 md:pt-12 pb-xl">
          <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-2">
            About Kelmon
          </p>
          <h1 className="font-display-lg text-display-md md:text-display-lg text-on-surface mb-4 max-w-2xl">
            Premium glam built for UoN
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-10">
            Beauty · Fashion · Glamour — curated for campus and delivered to your door.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mb-xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl rounded-tl-[90px] border border-primary/20 bg-surface-container">
              <Image
                src={aboutImage}
                alt="Kelmon products"
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
            <div className="space-y-4">
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                At Kelmon, we believe glam is more than a look — it&apos;s identity,
                confidence, and expression. We source authentic fashion and beauty so
                campus life feels elevated, from lecture halls to nights out.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Shop bags, perfumes, nails, and fashion, then get everything delivered
                straight to your hostel. Free over {formatKes(3000)}.
              </p>
              <ul className="space-y-3 pt-2">
                {whyPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 font-body-md text-body-md text-on-surface"
                  >
                    <span
                      className="material-symbols-outlined text-primary text-[20px] mt-0.5"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/shop"
                className="inline-flex h-11 px-7 rounded-full btn-primary text-white font-button-text text-button-text items-center gap-2 mt-2"
              >
                Shop the collection
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>

        <FaqSection image={faqImage} />
      </main>
    </AppShell>
  );
}
