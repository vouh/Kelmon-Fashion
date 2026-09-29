"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Full-screen, muted, endlessly looping video at the top of /about.
 *
 * Muted + playsInline is what lets browsers (iOS Safari included) autoplay it.
 * Visitors who prefer reduced motion get the still poster instead, and anyone
 * can pause it with the button in the corner.
 */
export default function AboutVideoHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      setPlaying(false);
      return;
    }
    // Some browsers ignore the autoplay attribute until play() is called.
    void video.play().catch(() => setPlaying(false));
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <section
      className="relative isolate flex h-svh min-h-[560px] items-end overflow-hidden bg-[#140a1c]"
      aria-label="About Kelmon"
    >
      <video
        ref={videoRef}
        className="about-hero-video absolute inset-0 -z-20 h-full w-full object-cover"
        src="/videos/about-hero.mp4"
        poster="/videos/about-hero-poster.jpg"
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
          <p className="hero-rise flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ead2a1]" style={{ animationDelay: "150ms" }}>
            <span className="hero-line inline-block h-px w-10 bg-[#ead2a1]" style={{ animationDelay: "150ms" }} />
            Our story
          </p>
          <h1
            className="hero-rise mt-5 font-display-lg text-[2.75rem] leading-[1.02] tracking-tight md:text-7xl lg:text-8xl"
            style={{ animationDelay: "300ms" }}
          >
            Glam is identity.
            <span className="block text-[#ead2a1]/90 italic font-normal">Wear it well.</span>
          </h1>
          <p
            className="hero-rise mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg"
            style={{ animationDelay: "480ms" }}
          >
            Kelmon curates fragrance, bags and finishing touches for students who show up — checked,
            packed with care, and delivered to your campus.
          </p>
          <div className="hero-rise mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "640ms" }}>
            <Link
              href="/shop"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary transition hover:bg-[#ead2a1]"
            >
              Shop the collection
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <a
              href="#story"
              className="inline-flex h-12 items-center rounded-full border border-white/35 px-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition hover:border-[#ead2a1] hover:text-[#ead2a1]"
            >
              Our promise
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <a
        href="#story"
        aria-label="Scroll to our story"
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60 transition hover:text-white md:flex"
      >
        Scroll
        <span className="relative block h-10 w-px overflow-hidden bg-white/20">
          <span className="about-scroll-dot absolute left-0 top-0 block h-3 w-px bg-white" />
        </span>
      </a>

      {/* Pause / play — moving video should always be stoppable. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause background video" : "Play background video"}
        className="absolute bottom-6 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:border-[#ead2a1] hover:text-[#ead2a1] md:right-10"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
          {playing ? "pause" : "play_arrow"}
        </span>
      </button>
    </section>
  );
}
