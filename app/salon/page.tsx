"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { salonServices } from "@/lib/salon";
import { formatKes } from "@/lib/products";

export default function SalonPage() {
  const [phone, setPhone] = useState("");
  const [joined, setJoined] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    try {
      localStorage.setItem("kelmon-salon-waitlist", phone.trim());
    } catch {
      /* ignore */
    }
    setJoined(true);
  };

  return (
    <AppShell activeNav="salon">
      <main className="flex-1 w-full">
        <section className="px-margin-mobile md:px-margin-desktop pt-lg pb-md">
          <p className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-2">
            Salon services
          </p>
          <h1 className="font-display-lg text-display-md md:text-display-lg text-on-surface mb-3">
            Beauty that ate
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-8">
            Nails, lashes, brows, makeup — clock a service, join the waitlist, soft-launch the look.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-xl">
            {salonServices.map((service) => (
              <article
                key={service.id}
                className="rounded-3xl overflow-hidden bg-surface border border-primary/20 hover:border-primary transition-colors"
              >
                <div className="relative aspect-[4/3] bg-surface-container">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <h2 className="font-title-lg text-title-lg text-on-surface mb-1">{service.name}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-primary/10">
                    <p className="font-headline-sm text-headline-sm text-primary">
                      {formatKes(service.price)}
                    </p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                      {service.duration}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop pb-xl">
          <div className="rounded-3xl bg-primary p-8 md:p-10 max-w-2xl">
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest mb-2">
              Coming soon
            </p>
            <h2 className="font-headline-lg text-headline-lg text-white mb-3">
              Get notified when booking opens
            </h2>
            <p className="font-body-md text-body-md text-white/80 mb-6">
              Leave your number and we&apos;ll text you when booking goes live.
            </p>
            {joined ? (
              <p className="font-body-md text-body-md text-secondary" role="status">
                You&apos;re on the salon waitlist. We&apos;ll be in touch.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1 sr-only" htmlFor="salon-phone">
                  Phone number
                </label>
                <input
                  id="salon-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="flex-1 h-12 px-4 rounded-full bg-white text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <button
                  type="submit"
                  className="h-12 px-6 rounded-full bg-secondary text-black font-button-text text-button-text hover:opacity-90 transition-opacity"
                >
                  Notify me
                </button>
              </form>
            )}
            <p className="mt-6 font-body-md text-body-md text-white/70">
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
