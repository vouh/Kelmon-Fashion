"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/**
 * Full-screen, muted, endlessly looping video at the top of /about.
 *
 * Muted + playsInline is what lets browsers (iOS Safari included) autoplay it.
 * Visitors who prefer reduced motion get the still poster instead.
 */
export default function AboutVideoHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    // Some browsers ignore the autoplay attribute until play() is called, and
    // pause background tabs; resume whenever the page is visible again.
    const play = () => {
      if (document.visibilityState === "visible" && video.paused) void video.play().catch(() => {});
    };
    play();
    document.addEventListener("visibilitychange", play);
    return () => document.removeEventListener("visibilitychange", play);
  }, []);

  return (
    <section
      className="relative isolate flex h-svh min-h-[560px] items-end overflow-hidden bg-[#140a1c]"
      aria-label="About Kelmon"
    >
      <video
        ref={videoRef}
        className="about-hero-video absolute inset-0 -z-20 h-full w-full object-cover"
        src="/videos/about-hero.mp4"
        poster="/videos/about-hero-poster.webp"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        disablePictureInPicture
      />

      {/* Premium grade: plum wash, deep bottom for the type, and a soft vignette. */}
      <div className="absolute inset-0 -z-10 bg-[#2b1340]/35 mix-blend-multiply" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#12071a] via-[#1d1028]/55 to-[#1d1028]/25" />
      <div className="absolute inset-0 -z-10 [background:radial-gradient(ellipse_at_center,transparent_40%,rgba(10,4,16,0.65)_100%)]" />

      <div className="w-full px-margin-mobile md:px-margin-desktop pb-24 md:pb-28">
        <div className="max-w-3xl text-white">
          <h1
            className="hero-rise font-display-lg text-[2.75rem] leading-[1.02] tracking-tight md:text-7xl lg:text-8xl"
            style={{ animationDelay: "300ms" }}
          >
            Look good.
            <span className="block font-normal italic text-[#ead2a1]">Smell amazing.</span>
          </h1>
          <p
            className="hero-rise mt-6 max-w-lg text-base leading-relaxed text-white/85 md:text-lg"
            style={{ animationDelay: "480ms" }}
          >
            Your everyday glow-up, sorted. Discover standout scents, stylish bags and accessories
            made to match your vibe without stretching your budget.
          </p>
          <div className="hero-rise mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: "640ms" }}>
            <Link
              href="/shop"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_12px_35px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ead2a1]"
            >
              Explore the collection
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll cue: a bouncing arrow down to the rest of the page. */}
      <a
        href="#story"
        aria-label="Scroll down"
        className="about-scroll-arrow absolute bottom-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white/80 backdrop-blur-sm transition hover:border-[#ead2a1] hover:text-[#ead2a1]"
      >
        <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
          keyboard_arrow_down
        </span>
      </a>
    </section>
  );
}
