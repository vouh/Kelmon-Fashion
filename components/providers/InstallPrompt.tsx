"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logo from "@/lib/logo";

/**
 * Kelmon's own "Install the app" reminder.
 *
 * Browsers only nudge once: Chrome's mini-bar stays away for months after a
 * dismissal, and iPhones never show one. So on Android/desktop Chrome and
 * Edge the browser's install event is held and offered from a Kelmon button;
 * on iPhone/iPad, where install is only ever manual, the card shows the
 * Share → Add to Home Screen steps.
 *
 * It appears a few seconds into a visit and stays up until it's closed (✕ or
 * "Not now"), then stays away for 48 hours. Once installed, or opened as the
 * app, it never shows again. Add ?install-prompt to any page URL to preview
 * it regardless.
 *
 * The browser's install event is caught by an inline script in app/layout.tsx,
 * because Chrome can fire it before this component has mounted.
 */

declare global {
  interface Window {
    __kelmonInstallPrompt?: Event;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "kelmon-install-snoozed-until";
const INSTALLED_KEY = "kelmon-install-done";
const SNOOZE_MS = 48 * 60 * 60 * 1000;
/** Pause after arriving (or signing in) before the card slides in. */
const SHOW_AFTER_MS = 4000;
/** Pages where a card would get in the way of something important. */
const HIDDEN_ON = ["/admin", "/checkout", "/reset-password", "/forgot-password"];

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad in a real browser (in-app browsers like Instagram can't install). */
function isIosBrowser(): boolean {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && !/FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat/i.test(ua);
}

function snoozed(): boolean {
  try {
    if (localStorage.getItem(INSTALLED_KEY)) return true;
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export default function InstallPrompt() {
  const pathname = usePathname() ?? "/";
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"install" | "ios" | null>(null);
  const [visible, setVisible] = useState(false);
  /** Shown at most once per page load, even if the user signs out and in again. */
  const shownThisVisit = useRef(false);

  const hiddenHere = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  /** ?install-prompt in the URL shows the card now, ignoring any snooze. */
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).has("install-prompt");
    setPreview(forced);
    if (isStandalone() || (!forced && snoozed())) return;

    // Caught early by the inline script in app/layout.tsx.
    function takeCaught() {
      if (!window.__kelmonInstallPrompt) return;
      setDeferred(window.__kelmonInstallPrompt as BeforeInstallPromptEvent);
      setMode("install");
    }
    function onBeforeInstall(event: Event) {
      // Keep the browser's own mini-bar away; the Kelmon card offers it instead.
      event.preventDefault();
      window.__kelmonInstallPrompt = event;
      takeCaught();
    }
    function onInstalled() {
      remember(INSTALLED_KEY, "1");
      setVisible(false);
      setMode(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("kelmon-install-available", takeCaught);
    window.addEventListener("appinstalled", onInstalled);
    takeCaught();
    if (isIosBrowser()) setMode("ios");
    // Previewing on a browser that can't install (or already has): show the
    // iPhone-style steps so the card can still be seen.
    else if (forced) setMode((current) => current ?? "ios");
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("kelmon-install-available", takeCaught);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Appears a moment into the visit, once per page load.
  useEffect(() => {
    if (!mode || hiddenHere || shownThisVisit.current || (!preview && snoozed())) return;
    const timer = setTimeout(() => {
      shownThisVisit.current = true;
      setVisible(true);
    }, preview ? 500 : SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [mode, hiddenHere, preview]);

  // Leaving for checkout etc. hides it without counting as a dismissal.
  useEffect(() => {
    if (hiddenHere) setVisible(false);
  }, [hiddenHere]);

  function snooze() {
    remember(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setVisible(false);
  }


  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event can only be used once either way.
    setDeferred(null);
    if (outcome === "accepted") {
      remember(INSTALLED_KEY, "1");
      setVisible(false);
      setMode(null);
    } else {
      snooze();
    }
  }

  if (!visible || !mode) return null;

  return (
    <div
      role="dialog"
      aria-label="Install the Kelmon app"
      className="fixed inset-x-3 bottom-[5.75rem] z-[60] mx-auto max-w-md overflow-hidden rounded-2xl border border-primary/15 bg-white/95 p-3.5 shadow-[0_18px_50px_rgba(91,42,128,0.25)] backdrop-blur-xl md:bottom-5 md:left-auto md:right-5 md:mx-0 dark:bg-surface/95"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-white">
          <Image src={logo} alt="" width={44} height={44} className="h-10 w-10 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface">Get the Kelmon app</p>
          {mode === "install" ? (
            <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
              Shop faster from your home screen — free, no app store needed.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
              Tap{" "}
              <span className="inline-flex translate-y-[3px] items-center text-primary" aria-label="the Share button">
                <span className="material-symbols-outlined text-[16px]">ios_share</span>
              </span>{" "}
              <strong className="text-on-surface">Share</strong>, then{" "}
              <strong className="text-on-surface">Add to Home Screen</strong>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={snooze}
          aria-label="Not now"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-primary/10 hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {mode === "install" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={snooze}
            className="h-10 flex-1 rounded-xl border border-outline/40 text-sm font-medium text-on-surface transition hover:bg-primary/5"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void install()}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-on-primary transition hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Install
          </button>
        </div>
      )}
    </div>
  );
}
