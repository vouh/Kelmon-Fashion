"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Banner {
  image: string;
  /** Not shown on screen; names the slide for screen readers and the dot buttons. */
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  /** Where the subject sits, so object-cover never crops them out. */
  focus?: string;
}

const allBanners: Banner[] = [
  { image: "/images/heroes/kelmon-lifestyle.png", eyebrow: "Kelmon lifestyle", title: "Show up like you mean it.", body: "Campus style, beauty and accessories that make every day feel like your moment.", href: "/shop", cta: "Shop the edit" },
  { image: "/images/heroes/kelmon-men-cologne.png", eyebrow: "For him", title: "Two sprays. All the confidence.", body: "Fresh, bold colognes for the guy who walks in and owns the room.", href: "/shop?category=Perfumes", cta: "Shop men's scents", focus: "object-[70%_10%]" },
  { image: "/images/heroes/kelmon-perfume.png", eyebrow: "Signature scents", title: "Leave a little luxury behind.", body: "Find the fragrance that stays with you long after the lecture ends.", href: "/shop?category=Perfumes", cta: "Shop perfumes" },
  { image: "/images/heroes/kelmon-bag.png", eyebrow: "Carry your style", title: "The bag completes the look.", body: "Campus-ready bags that keep your essentials close and your fit together.", href: "/shop?category=Bags", cta: "Shop bags" },
  { image: "/images/heroes/kelmon-men-fragrance.png", eyebrow: "Men's fragrance", title: "Smell like your next big move.", body: "Deep, warm scents that linger — from lecture hall to late night.", href: "/shop?category=Perfumes", cta: "Find your scent", focus: "object-[70%_10%]" },
  { image: "/images/heroes/kelmon-accessories.png", eyebrow: "Finishing touches", title: "Make every outfit yours.", body: "The jewellery and accessories that turn a good look into your signature.", href: "/shop?category=Accessories", cta: "Shop accessories" },
];

const AUTOPLAY_MS = 6500;
/** Matches the CSS leave animation, after which the old slide is unmounted from view. */
const LEAVE_MS = 900;

/**
 * Full-screen hero carousel with layered transitions: the outgoing slide
 * fades and drifts back while the incoming image eases in with a slow
 * Ken Burns zoom and its text rises in line by line. Autoplays, pauses on
 * hover/focus, swipes on touch, and respects prefers-reduced-motion.
 */
export default function FullScreenHeroBanners() {
  // A banner whose image fails to load is dropped rather than shown broken.
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());
  const banners = allBanners.filter((b) => !broken.has(b.image));
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const leaveTimer = useRef<number | null>(null);
  /** Where the current touch began, and which way it is moving once that's clear. */
  const touch = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const [dragX, setDragX] = useState(0);
  const count = banners.length;

  const goTo = useCallback(
    (target: number, dir?: 1 | -1) => {
      const next = (target + count) % count;
      if (next === active) return;
      setDirection(dir ?? (next > active ? 1 : -1));
      setLeaving(active);
      setActive(next);
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
      leaveTimer.current = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    },
    [count, active]
  );

  const next = useCallback(() => goTo(active + 1, 1), [goTo, active]);
  const prev = useCallback(() => goTo(active - 1, -1), [goTo, active]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(next, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, next]);

  useEffect(
    () => () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    },
    []
  );

  return (
    <section
      // Full screen on every device (the nav floats over the top band). Photos
      // are cropped to fit rather than letterboxed; each banner's `focus`
      // keeps the model in frame.
      className="hero-stage relative isolate overflow-hidden bg-background h-svh min-h-[560px] touch-pan-y select-none"
      aria-label="Kelmon collections"
      aria-roledescription="carousel"
      // Mouse only: phones fire a synthetic hover on tap with no matching
      // leave, which would pause autoplay for good after the first touch.
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPaused(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setPaused(false);
      }}
      // Keyboard focus only, for the same reason: a tapped dot keeps focus.
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).matches(":focus-visible")) setPaused(true);
      }}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") next();
        if (event.key === "ArrowLeft") prev();
      }}
      onTouchStart={(event) => {
        touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, axis: null };
      }}
      onTouchMove={(event) => {
        const start = touch.current;
        if (!start) return;
        const dx = event.touches[0].clientX - start.x;
        const dy = event.touches[0].clientY - start.y;
        if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
          start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (start.axis === "x") setPaused(true);
        }
        if (start.axis === "x") setDragX(dx);
      }}
      onTouchEnd={(event) => {
        const start = touch.current;
        touch.current = null;
        setDragX(0);
        if (start?.axis !== "x") return;
        setPaused(false);
        const dx = event.changedTouches[0].clientX - start.x;
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      }}
      onTouchCancel={() => {
        touch.current = null;
        setDragX(0);
        setPaused(false);
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: dragX ? `translateX(${dragX * 0.6}px)` : undefined,
          transition: dragX ? "none" : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
      {banners.map((banner, index) => {
        const isActive = index === active;
        const isLeaving = index === leaving;
        const visible = isActive || isLeaving;
        return (
          <article
            key={banner.image}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}: ${banner.eyebrow}`}
            aria-hidden={!isActive}
            inert={!isActive}
            className={`absolute inset-0 flex items-center pt-[5.25rem] md:pt-[6rem] ${
              isActive ? "z-20 hero-slide-enter" : isLeaving ? "z-10 hero-slide-leave" : "z-0 opacity-0"
            }`}
            style={{ ["--hero-dir" as string]: direction }}
          >
            {/* The photo starts just below the floating nav so it never covers a face. */}
            <div className="absolute inset-x-0 bottom-0 top-[5.25rem] -z-10 overflow-hidden bg-[#1d1028] md:top-[6rem]">
            {visible || index === (active + 1) % count ? (
              <Image
                src={banner.image}
                alt=""
                fill
                priority={index === 0}
                className={`object-cover ${banner.focus ?? "object-[68%_center]"} ${
                  isActive ? "hero-kenburns" : ""
                }`}
                // On a portrait phone the wide photo is drawn at full screen
                // height, which makes it about five screen-widths wide.
                sizes="(max-width: 767px) 500vw, 100vw"
                quality={90}
                onError={() => {
                  setBroken((prev) => new Set(prev).add(banner.image));
                  if (isActive) setActive(0);
                }}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1d1028]/90 via-[#2b1735]/55 to-[#2b1735]/5" />
            </div>

            {isActive && (
              <div className="w-full px-margin-mobile md:px-margin-desktop">
                <div className="max-w-xl pt-16 pb-44 md:py-10 text-white">
                  <h1 className="hero-rise font-display-lg text-4xl leading-[0.98] md:text-6xl lg:text-7xl" style={{ animationDelay: "380ms" }}>
                    {banner.title}
                  </h1>
                  <p className="hero-rise mt-5 max-w-md text-base leading-relaxed text-white/85 md:text-lg" style={{ animationDelay: "520ms" }}>
                    {banner.body}
                  </p>
                  <Link
                    href={banner.href}
                    className="hero-rise group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-xs font-semibold uppercase tracking-[0.15em] text-primary transition hover:bg-[#ead2a1]"
                    style={{ animationDelay: "660ms" }}
                  >
                    {banner.cta}
                    <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1" aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </article>
        );
      })}
      </div>

      {/* Controls. On phones, swiping replaces the arrows. */}
      <div className="absolute bottom-28 inset-x-0 z-30 flex items-center justify-center gap-4 md:bottom-8">
        <button type="button" onClick={prev} aria-label="Previous banner" className="hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white border border-white/40 backdrop-blur-sm transition hover:bg-primary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        </button>
        <div className="flex gap-1">
          {banners.map((banner, index) => (
            <button
              key={banner.image}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show ${banner.eyebrow}`}
              aria-current={active === index ? "true" : undefined}
              className="flex h-11 w-9 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-white"
            >
              <span className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-500 ${active === index ? "w-8 bg-white/35" : "w-2 bg-white/50"}`}>
                {/* Progress fill: shows time until the next slide. */}
                {active === index && (
                  <span
                    key={`${active}-${paused}`}
                    className={`absolute inset-y-0 left-0 rounded-full bg-white ${paused ? "w-full" : "hero-progress"}`}
                    style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={next} aria-label="Next banner" className="hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white border border-white/40 backdrop-blur-sm transition hover:bg-primary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
      </div>
    </section>
  );
}
