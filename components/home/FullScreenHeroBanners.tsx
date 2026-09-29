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
/** How long a released swipe takes to glide into place. */
const SETTLE_MS = 420;
const SETTLE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * A touch swipe in progress. `dir` 1 means the next slide is being pulled in
 * from the right (finger moving left); -1 means the previous one from the left.
 */
type Swipe = { peek: number; dir: 1 | -1; dx: number; phase: "drag" | "go" | "back" };

/**
 * Full-screen hero carousel with layered transitions: the outgoing slide
 * fades and drifts back while the incoming image eases in with a slow
 * Ken Burns zoom and its text rises in line by line. On touch, the whole
 * slide follows the finger with the neighbouring slide attached beside it,
 * then glides the rest of the way (or springs back) on release. Autoplays,
 * pauses on hover/focus, and respects prefers-reduced-motion.
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
  const sectionRef = useRef<HTMLElement>(null);
  /** Where the current touch began, which way it is moving once that's clear, and how fast. */
  const touch = useRef<{ x: number; y: number; axis: "x" | "y" | null; lastX: number; lastT: number; vx: number } | null>(null);
  const [swipe, setSwipeState] = useState<Swipe | null>(null);
  /** The same swipe, readable synchronously from touch handlers between renders. */
  const swipeRef = useRef<Swipe | null>(null);
  const setSwipe = (value: Swipe | null) => {
    swipeRef.current = value;
    setSwipeState(value);
  };
  const settleTimer = useRef<number | null>(null);
  /** The slide that arrived by swipe: it's already in place, so it skips the entrance animations. */
  const [swipedIn, setSwipedIn] = useState<number | null>(null);
  const count = banners.length;

  const goTo = useCallback(
    (target: number, dir?: 1 | -1) => {
      if (swipeRef.current) return;
      const next = (target + count) % count;
      if (next === active) return;
      setDirection(dir ?? (next > active ? 1 : -1));
      setSwipedIn(null);
      setLeaving(active);
      setActive(next);
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
      leaveTimer.current = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    },
    [count, active]
  );

  function release(vx: number) {
    const current = swipeRef.current;
    if (!current) return;
    const width = sectionRef.current?.offsetWidth ?? window.innerWidth;
    const pulled = -current.dx * current.dir;
    // A long pull, or a quick flick the same way, commits to the next slide.
    const go = pulled > width * 0.2 || (pulled > 20 && -vx * current.dir > 0.35);
    setSwipe({ ...current, phase: go ? "go" : "back" });
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (go) {
        setSwipedIn(current.peek);
        setLeaving(null);
        setActive(current.peek);
      }
      setSwipe(null);
      setPaused(false);
    }, SETTLE_MS);
  }

  /** Where each slide sits while a swipe is in progress; undefined otherwise. */
  function slideStyle(index: number): React.CSSProperties | undefined {
    if (!swipe || (index !== active && index !== swipe.peek)) return undefined;
    const isPeek = index === swipe.peek;
    let transform: string;
    if (swipe.phase === "drag") {
      transform = isPeek ? `translateX(calc(${swipe.dx}px + ${swipe.dir * 100}%))` : `translateX(${swipe.dx}px)`;
    } else if (swipe.phase === "go") {
      transform = isPeek ? "translateX(0)" : `translateX(${-swipe.dir * 100}%)`;
    } else {
      transform = isPeek ? `translateX(${swipe.dir * 100}%)` : "translateX(0)";
    }
    return {
      transform,
      transition: swipe.phase === "drag" ? "none" : `transform ${SETTLE_MS}ms ${SETTLE_EASE}`,
      willChange: "transform",
    };
  }

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
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
    },
    []
  );

  return (
    <section
      ref={sectionRef}
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
        // A released swipe is still gliding into place; let it finish.
        if (count < 2 || swipeRef.current) {
          touch.current = null;
          return;
        }
        const { clientX, clientY } = event.touches[0];
        touch.current = { x: clientX, y: clientY, axis: null, lastX: clientX, lastT: event.timeStamp, vx: 0 };
      }}
      onTouchMove={(event) => {
        const start = touch.current;
        if (!start) return;
        const { clientX, clientY } = event.touches[0];
        const dx = clientX - start.x;
        const dy = clientY - start.y;
        if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
          start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (start.axis === "x") {
            setPaused(true);
            setLeaving(null);
          }
        }
        if (start.axis !== "x") return;
        const elapsed = event.timeStamp - start.lastT;
        if (elapsed > 0) start.vx = 0.8 * ((clientX - start.lastX) / elapsed) + 0.2 * start.vx;
        start.lastX = clientX;
        start.lastT = event.timeStamp;
        const dir: 1 | -1 = dx < 0 ? 1 : dx > 0 ? -1 : (swipeRef.current?.dir ?? 1);
        setSwipe({ peek: (active + dir + count) % count, dir, dx, phase: "drag" });
      }}
      onTouchEnd={() => {
        const start = touch.current;
        touch.current = null;
        if (start?.axis !== "x") return;
        if (swipeRef.current) release(start.vx);
        else setPaused(false);
      }}
      onTouchCancel={() => {
        touch.current = null;
        if (swipeRef.current) release(0);
        else setPaused(false);
      }}
    >
      <div className="absolute inset-0">
      {banners.map((banner, index) => {
        const isActive = index === active;
        const isLeaving = index === leaving;
        const isPeek = swipe?.peek === index && !isActive;
        const settled = isActive && index === swipedIn;
        const visible = isActive || isLeaving || isPeek;
        const preload = index === (active + 1) % count || index === (active - 1 + count) % count;
        return (
          <div key={banner.image} className="absolute inset-0" style={slideStyle(index)}>
          <article
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}: ${banner.eyebrow}`}
            aria-hidden={!isActive}
            inert={!isActive}
            className={`absolute inset-0 flex items-center pt-[5.25rem] md:pt-[6rem] ${
              isActive
                ? `z-20 ${settled ? "hero-static" : "hero-slide-enter"}`
                : isPeek
                  ? "z-20 hero-static"
                  : isLeaving
                    ? "z-10 hero-slide-leave"
                    : "z-0 opacity-0"
            }`}
            style={{ ["--hero-dir" as string]: direction }}
          >
            {/* The photo starts just below the floating nav so it never covers a face. */}
            <div className="absolute inset-x-0 bottom-0 top-[5.25rem] -z-10 overflow-hidden bg-[#1d1028] md:top-[6rem]">
            {visible || preload ? (
              <Image
                src={banner.image}
                alt=""
                fill
                priority={index === 0}
                className={`object-cover ${banner.focus ?? "object-[68%_center]"} ${
                  isActive || isPeek ? "hero-kenburns" : ""
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

            {(isActive || isPeek) && (
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
          </div>
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
