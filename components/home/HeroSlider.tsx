"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatKes } from "@/lib/products";

export type HeroSlide =
  | {
      type: "product";
      product: Product;
      kicker: string;
      title: string;
      description: string;
      ctaLabel: string;
      ctaHref: string;
    }
  | {
      type: "service";
      image: string;
      kicker: string;
      title: string;
      description: string;
      ctaLabel: string;
      ctaHref: string;
      secondaryCtaLabel?: string;
      secondaryCtaHref?: string;
    };

interface HeroSliderProps {
  slides: HeroSlide[];
  autoPlayMs?: number;
}

export default function HeroSlider({ slides, autoPlayMs = 4500 }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), autoPlayMs);
    return () => window.clearInterval(id);
  }, [count, paused, autoPlayMs]);

  if (count === 0) return null;

  const slide = slides[index];
  const image = slide.type === "product" ? slide.product.image : slide.image;
  const price = slide.type === "product" ? formatKes(slide.product.price) : null;

  return (
    <section
      className="relative min-h-[85vh] overflow-hidden bg-black"
      aria-roledescription="carousel"
      aria-label="Products and services"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        const src = s.type === "product" ? s.product.image : s.image;
        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <Image
              src={src}
              alt=""
              fill
              unoptimized
              priority={i === 0}
              className={`object-cover ${i === index ? "hero-zoom" : ""}`}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        );
      })}

      <div className="relative z-10 min-h-[85vh] flex flex-col justify-end md:justify-center px-margin-mobile md:px-margin-desktop py-16 md:py-xl">
        <div key={index} className="max-w-2xl space-y-4">
          <p
            className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] landing-fade"
            style={{ animationDelay: "0.05s" }}
          >
            {slide.kicker}
            {slide.type === "product" && (
              <span className="text-white/50"> · {slide.product.category}</span>
            )}
          </p>

          <h1
            className="font-display-lg text-display-md md:text-display-lg text-white leading-tight landing-fade whitespace-pre-line"
            style={{ animationDelay: "0.15s" }}
          >
            {slide.title}
          </h1>

          {price && (
            <p
              className="font-headline-sm text-headline-sm text-secondary landing-fade"
              style={{ animationDelay: "0.25s" }}
            >
              {price}
            </p>
          )}

          <p
            className="font-body-lg text-body-lg text-white/75 max-w-lg landing-fade"
            style={{ animationDelay: "0.3s" }}
          >
            {slide.description}
          </p>

          <div className="flex flex-wrap gap-3 pt-2 landing-fade" style={{ animationDelay: "0.4s" }}>
            <Link
              href={slide.ctaHref}
              className="inline-flex h-12 px-8 btn-primary text-white font-button-text text-button-text items-center gap-2"
            >
              {slide.ctaLabel}
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            {slide.type === "service" && slide.secondaryCtaHref && (
              <Link
                href={slide.secondaryCtaHref}
                className="inline-flex h-12 px-8 border border-white/40 text-white font-button-text text-button-text hover:border-secondary hover:text-secondary transition-colors items-center"
              >
                {slide.secondaryCtaLabel}
              </Link>
            )}
          </div>

          <p
            className="font-label-caps text-label-caps text-white/50 uppercase tracking-widest pt-2 landing-fade"
            style={{ animationDelay: "0.5s" }}
          >
            {index + 1} / {count} · use arrows
          </p>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="slider-arrow absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20"
          >
            <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="slider-arrow absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20"
          >
            <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
              chevron_right
            </span>
          </button>
        </>
      )}

      {count > 1 && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
          role="tablist"
          aria-label="Hero slides"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === index ? "w-9 bg-primary" : "w-2.5 bg-white/45 hover:bg-primary/80"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
