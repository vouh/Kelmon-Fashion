"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { salonServices } from "@/lib/salon";
import { formatKes } from "@/lib/products";

export default function SalonPage() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      localStorage.setItem("kelmon-salon-waitlist", email.trim());
    } catch {
      /* ignore */
    }
    setJoined(true);
  };

  return (
    <AppShell activeNav="salon">
      <main className="flex-grow bg-[#faf6fc] dark:bg-background">
        <section className="px-margin-mobile md:px-margin-desktop pt-10 md:pt-14 pb-10 md:pb-12">
          <div className="max-w-[1100px] mx-auto text-center">
            <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-2">
              Salon
            </p>
            <h1 className="font-display-lg text-display-md md:text-display-lg text-on-surface mb-3">
              Clock the glam
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
              Nails, lashes, brows, makeup — pick a service and hop on the waitlist until booking goes live.
            </p>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop pb-16 md:pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 max-w-[1100px] mx-auto">
            {salonServices.map((service) => (
              <article
                key={service.id}
                className="group bg-white dark:bg-surface overflow-hidden shadow-[0_8px_28px_rgba(142,68,173,0.1)] hover:shadow-[0_14px_36px_rgba(142,68,173,0.18)] transition-shadow"
              >
                <div className="relative aspect-[4/3] bg-surface-container overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="p-5 md:p-6">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                      {service.duration}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {formatKes(service.price)}
                    </p>
                  </div>
                  <h2 className="font-display-lg text-lg md:text-xl text-on-surface mb-2 tracking-tight">
                    {service.name}
                  </h2>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    {service.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop pb-16 md:pb-20">
          <div className="bg-primary text-white p-8 md:p-12 max-w-2xl mx-auto text-center">
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
              Coming soon
            </p>
            <h2 className="font-display-lg text-xl md:text-2xl mb-3 tracking-tight">
              Get notified when booking opens
            </h2>
            <p className="text-white/85 text-sm leading-relaxed mb-6 max-w-md mx-auto">
              Drop your email and we&apos;ll let you know when salon booking goes live.
            </p>
            {joined ? (
              <p className="text-secondary text-sm" role="status">
                You&apos;re on the salon waitlist. We&apos;ll be in touch.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <label className="flex-1 sr-only" htmlFor="salon-email">
                  Email
                </label>
                <input
                  id="salon-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 h-12 px-4 bg-white text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <button
                  type="submit"
                  className="h-12 px-7 bg-secondary text-black text-[11px] font-semibold uppercase tracking-[0.14em] hover:opacity-90 transition-opacity"
                >
                  Notify me
                </button>
              </form>
            )}
            <p className="mt-6 text-sm text-white/70">
              Prefer products?{" "}
              <Link href="/shop" className="text-secondary underline underline-offset-2">
                Shop nail kits &amp; beauty
              </Link>
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
