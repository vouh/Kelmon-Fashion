"use client";

import { useEffect, useState } from "react";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Nairobi",
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Nairobi",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Live Kenya date and time, e.g. "WED 30 SEP 2026 · 14:08:05". */
export default function FooterClock() {
  // Starts empty so the server and browser render the same thing; the
  // browser fills it in and ticks every second.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex min-w-[15rem] items-center justify-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white [text-shadow:0_0_6px_rgba(255,255,255,0.85),0_0_14px_rgba(227,196,126,0.75),0_0_28px_rgba(227,196,126,0.45)]">
      <span
        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#E3C47E] shadow-[0_0_8px_2px_rgba(227,196,126,0.9)]"
        aria-hidden="true"
      />
      {now ? (
        <time dateTime={now.toISOString()}>
          {DATE_FORMAT.format(now).replace(/,/g, "")}
          <span className="mx-1.5 text-white/60">·</span>
          {TIME_FORMAT.format(now)}
        </time>
      ) : (
        <span className="text-white/40">Loading time…</span>
      )}
    </span>
  );
}
