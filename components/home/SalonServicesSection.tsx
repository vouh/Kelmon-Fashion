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
  const [activeId, setActiveId] = useState(trio[1]?.id ?? trio[0]?.id ?? "");

  if (trio.length === 0) return null;

  return (
    <section className="px-margin-mobile md:px-margin-desktop py-14 md:py-20 bg-[#faf6fc] dark:bg-surface overflow-hidden">
      <div className="text-center mb-10 md:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-2">
          Salon
        </p>
        <h2 className="font-display-lg text-xl md:text-2xl text-on-surface tracking-tight">
          Book campus glam
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant max-w-md mx-auto">
          Tap a look to highlight it — then book from the salon page.
        </p>
      </div>

      {/* Three cards — middle purple, sides white glow */}
      <div className="relative flex flex-col md:flex-row items-center md:items-stretch justify-center gap-5 md:gap-4 lg:gap-6 max-w-5xl mx-auto">
        {trio.map((service, i) => {
          const isMiddle = i === 1;
          const isActive = service.id === activeId;
          const elevate = isActive || (isMiddle && activeId === trio[1]?.id);

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => setActiveId(service.id)}
              className={`group relative w-full max-w-[320px] md:max-w-none md:flex-1 text-left rounded-3xl overflow-hidden transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                elevate
                  ? "md:scale-110 md:z-20 shadow-[0_24px_60px_rgba(142,68,173,0.35)]"
                  : "md:scale-95 md:z-10 opacity-95 hover:opacity-100"
              } ${
                isMiddle || isActive
                  ? "bg-primary border border-primary"
                  : "bg-white dark:bg-surface border border-primary/10 shadow-[0_0_40px_rgba(142,68,173,0.18),0_12px_32px_rgba(142,68,173,0.1)]"
              }`}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={service.image}
                  alt=""
                  fill
                  unoptimized
                  className={`object-cover transition-transform duration-700 group-hover:scale-105 ${
                    isMiddle || isActive ? "opacity-90" : ""
                  }`}
                  sizes="(max-width: 768px) 90vw, 33vw"
                  aria-hidden="true"
                />
                {(isMiddle || isActive) && (
                  <div className="absolute inset-0 bg-primary/25 mix-blend-multiply pointer-events-none" />
                )}
                <div
                  className={`absolute inset-x-0 bottom-0 h-2/5 pointer-events-none ${
                    isMiddle || isActive
                      ? "bg-gradient-to-t from-primary via-primary/70 to-transparent"
                      : "bg-gradient-to-t from-white via-white/80 to-transparent dark:from-surface dark:via-surface/80"
                  }`}
                />
              </div>

              <div
                className={`relative -mt-16 px-5 pb-5 pt-2 ${
                  isMiddle || isActive ? "text-white" : "text-on-surface"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isMiddle || isActive
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      {service.icon}
                    </span>
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isMiddle || isActive ? "text-white/80" : "text-on-surface-variant"
                    }`}
                  >
                    {service.duration}
                  </span>
                </div>
                <h3 className="text-base md:text-lg font-semibold tracking-tight mb-1">
                  {service.name}
                </h3>
                <p
                  className={`text-xs leading-relaxed line-clamp-2 mb-3 ${
                    isMiddle || isActive ? "text-white/85" : "text-on-surface-variant"
                  }`}
                >
                  {service.description}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      isMiddle || isActive ? "text-[#C5A059]" : "text-primary"
                    }`}
                  >
                    {formatKes(service.price)}
                  </span>
                  {(isMiddle || isActive) && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
                      Selected
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center mt-10 md:mt-12">
        <Link
          href="/salon"
          className="inline-flex h-11 px-8 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-[0.14em] items-center gap-2 hover:bg-[#7a3a96] transition-colors shadow-[0_8px_28px_rgba(142,68,173,0.3)]"
        >
          View all services
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>
    </section>
  );
}
