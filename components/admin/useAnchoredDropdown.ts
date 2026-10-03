"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface DropdownBox {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

/**
 * A dropdown list that floats just under its input (fixed, measured from it)
 * rather than sitting in the flow, so it overlays a popup instead of pushing
 * it down — and isn't clipped by the popup's scrolling body. Stays pinned as
 * the page scrolls, resizes or the phone keyboard opens, and a tap outside
 * the input and the list closes it.
 */
export function useAnchoredDropdown() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<DropdownBox | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const top = rect.bottom + 4;
      setBox({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(160, Math.min(viewport * 0.5, viewport - top - 12)),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return { open, setOpen, anchorRef, listRef, box };
}

// text-base on phones: iOS zooms the page into any input under 16px.
export const dropdownInputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-800 py-3 pl-10 pr-11 text-base text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none disabled:opacity-60 sm:text-sm";

export const dropdownListClass =
  "fixed z-[130] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40";
