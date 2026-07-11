"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { SalonService } from "@/lib/salon";
import { formatKes } from "@/lib/products";

interface SalonServicesSectionProps {
  services: SalonService[];
}

export default function SalonServicesSection({ services }: SalonServicesSectionProps) {
  const trio = services.slice(0, 3);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const featuredId = hoveredId ?? trio[1]?.id ?? trio[0]?.id;

  if (trio.length === 0) return null;

  return (
    <section className="px-margin-mobile md:px-margin-desktop py-14 md:py-20 bg-[#faf6fc] dark:bg-surface overflow-hidden">
      <div className="text-center mb-10 md:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-2">
          Salon
        </p>
        <h2 className="font-display-lg text-xl md:text-2xl text-on-surface tracking-tight">
          Clock the glam
        </h2>
      </div>

      <div
        className="relative flex flex-col md:flex-row items-center md:items-stretch justify-center gap-6 md:gap-5 lg:gap-7 max-w-5xl mx-auto"
        onMouseLeave={() => setHoveredId(null)}
      >
        {trio.map((service) => {
          const isActive = service.id === featuredId;

          return (
            <Link
              key={service.id}
              href="/salon"
              onMouseEnter={() => setHoveredId(service.id)}
              onFocus={() => setHoveredId(service.id)}
              className={`group relative w-full max-w-[320px] md:max-w-[300px] lg:max-w-[320px] text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? "md:scale-105 md:z-20 bg-primary border border-primary shadow-[0_16px_40px_rgba(142,68,173,0.3)]"
                  : "md:scale-[0.97] md:z-10 bg-white dark:bg-surface border border-primary/10 shadow-[0_0_28px_rgba(142,68,173,0.14),0_8px_20px_rgba(142,68,173,0.08)]"
              }`}
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={service.image}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="240px"
                  aria-hidden="true"
                />
              </div>

              <div className={`px-3.5 py-3 ${isActive ? "text-white" : "text-on-surface"}`}>
                <p
                  className={`text-[9px] font-semibold uppercase tracking-wider mb-1 ${
                    isActive ? "text-white/75" : "text-on-surface-variant"
                  }`}
                >
                  {service.duration}
                </p>
                <h3 className="text-sm font-semibold tracking-tight mb-0.5">
                  {service.name}
                </h3>
                <p
                  className={`text-[11px] leading-relaxed line-clamp-2 mb-2 ${
                    isActive ? "text-white/85" : "text-on-surface-variant"
                  }`}
                >
                  {service.description}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? "text-[#C5A059]" : "text-primary"
                    }`}
                  >
                    {formatKes(service.price)}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/90">
                      Featured
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center mt-10 md:mt-12">
        <Link
          href="/salon"
          className="inline-flex h-11 px-8 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-[0.14em] items-center gap-2 hover:bg-[#7a3a96] transition-colors shadow-[0_8px_28px_rgba(142,68,173,0.3)]"
        >
          See all services
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>
    </section>
  );
}
