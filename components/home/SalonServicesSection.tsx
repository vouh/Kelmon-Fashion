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
  const [activeId, setActiveId] = useState(services[0]?.id ?? "");
  const active = services.find((s) => s.id === activeId) ?? services[0];

  if (!active) return null;

  return (
    <section className="px-margin-mobile md:px-margin-desktop py-14 md:py-20 bg-[#faf6fc] dark:bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-2">
            Salon
          </p>
          <h2 className="font-display-lg text-xl md:text-2xl text-on-surface tracking-tight">
            Book campus glam
          </h2>
          <p className="mt-1.5 text-sm text-on-surface-variant max-w-md">
            Pick a service to preview — nails, lashes, brows &amp; more.
          </p>
        </div>
        <Link
          href="/salon"
          className="inline-flex h-10 px-5 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-[0.12em] items-center gap-1.5 hover:bg-[#7a3a96] transition-colors"
        >
          All services
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-5 md:gap-6">
        {/* Featured preview */}
        <div
          key={active.id}
          className="relative min-h-[320px] md:min-h-[420px] rounded-3xl overflow-hidden border border-primary/15 shadow-[0_12px_40px_rgba(142,68,173,0.12)] group"
        >
          <Image
            src={active.image}
            alt=""
            fill
            unoptimized
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 65vw"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a1a36]/90 via-[#2a1a36]/35 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 text-white">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-medium">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  schedule
                </span>
                {active.duration}
              </span>
              <span className="inline-flex items-center h-7 px-3 rounded-full bg-[#C5A059] text-[#2a1a36] text-[11px] font-semibold">
                {formatKes(active.price)}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight mb-1.5">
              {active.name}
            </h3>
            <p className="text-sm text-white/85 max-w-lg leading-relaxed mb-4">
              {active.description}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/salon"
                className="inline-flex h-10 px-5 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-[0.1em] items-center hover:bg-[#7a3a96] transition-colors"
              >
                Join waitlist
              </Link>
              <button
                type="button"
                onClick={() => {
                  const idx = services.findIndex((s) => s.id === active.id);
                  const next = services[(idx + 1) % services.length];
                  setActiveId(next.id);
                }}
                className="inline-flex h-10 px-4 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-semibold uppercase tracking-[0.1em] items-center gap-1 hover:bg-white/25 transition-colors"
              >
                Next
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive service list */}
        <div
          className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible hide-scrollbar snap-x snap-mandatory pb-1 lg:pb-0"
          role="tablist"
          aria-label="Salon services"
        >
          {services.map((service) => {
            const isActive = service.id === active.id;
            return (
              <button
                key={service.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(service.id)}
                className={`snap-start shrink-0 lg:shrink w-[220px] lg:w-full text-left rounded-2xl border p-3.5 transition-all duration-300 ${
                  isActive
                    ? "bg-primary border-primary text-white shadow-[0_10px_28px_rgba(142,68,173,0.3)] scale-[1.02]"
                    : "bg-white dark:bg-surface-container border-primary/15 text-on-surface hover:border-primary/40 hover:bg-primary/[0.04]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {service.icon}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isActive ? "text-white" : "text-on-surface"
                      }`}
                    >
                      {service.name}
                    </p>
                    <p
                      className={`text-xs mt-0.5 line-clamp-2 ${
                        isActive ? "text-white/80" : "text-on-surface-variant"
                      }`}
                    >
                      {service.duration} · {formatKes(service.price)}
                    </p>
                  </div>
                  {isActive && (
                    <span
                      className="material-symbols-outlined text-white/90 text-[18px] shrink-0"
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
