"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";

interface SaleBannerProps {
  product: Product;
  /** Sale end as ISO string; defaults to 3 days from mount */
  endsAt?: string;
}

function useCountdown(endsAt: number) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, endsAt - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function SaleBanner({ product, endsAt }: SaleBannerProps) {
  const [target] = useState(() =>
    endsAt ? new Date(endsAt).getTime() : Date.now() + 3 * 24 * 60 * 60 * 1000
  );
  const { days, hours, minutes, seconds } = useCountdown(target);

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];

  return (
    <section className="px-margin-mobile md:px-margin-desktop pb-xl">
      <div className="relative overflow-hidden rounded-3xl bg-black border border-primary/30 min-h-[280px] md:min-h-[320px]">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 p-8 md:p-12">
          <div className="space-y-5 relative z-10">
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
              Limited offer
            </p>
            <h2 className="font-headline-lg text-headline-lg text-white">Campus Drop Sale</h2>
            <p className="font-body-lg text-body-lg text-white/70 max-w-md">
              Free delivery over KES 3,000 — grab your glam before the timer hits zero.
            </p>
            <div className="flex flex-wrap gap-3">
              {units.map((u) => (
                <div
                  key={u.label}
                  className="min-w-[64px] px-3 py-2 rounded-xl bg-primary text-center"
                >
                  <p className="font-headline-sm text-headline-sm text-white tabular-nums">
                    {String(u.value).padStart(2, "0")}
                  </p>
                  <p className="font-label-caps text-[10px] text-white/80 uppercase tracking-wider">
                    {u.label}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href={`/product/${product.id}`}
              className="inline-flex h-11 px-6 rounded-full bg-secondary text-black font-button-text text-button-text items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Shop the deal
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="relative h-48 md:h-64 justify-self-center w-full max-w-xs">
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className="object-contain"
              sizes="280px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
