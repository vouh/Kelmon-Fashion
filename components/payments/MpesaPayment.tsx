"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { formatKes } from "@/lib/products";

/**
 * Sends an STK push and then waits for the real outcome instead of assuming
 * success. The order only counts as paid once Safaricom's callback (or the
 * status query fallback in /api/mpesa/status) says so.
 */

const POLL_EVERY_MS = 3_000;
/** Safaricom's prompt itself expires after about a minute; allow for slow callbacks. */
const GIVE_UP_AFTER_MS = 120_000;

export type MpesaPayState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "waiting"; message: string }
  | { phase: "paid" }
  | { phase: "failed"; reason: string }
  | { phase: "timeout" };

export type MpesaOutcome = "paid" | "failed" | "timeout" | "cancelled";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

/**
 * Asks the server to send the STK prompt. Resolves with Safaricom's customer
 * message, or the reason it couldn't be sent (bad number, sold out, M-Pesa
 * down…). Never throws.
 */
export async function sendStkPrompt(
  orderId: string,
  phone: string
): Promise<{ ok: true; message: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch("/api/mpesa/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, phone }),
      // The server gives Safaricom 25s; allow a little more for the round trip.
      signal: AbortSignal.timeout(40_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      alreadyPending?: boolean;
    };
    // A prompt for this order is already on the phone (double-click, quick
    // retry): don't send another — just wait for the one that's there.
    if (res.status === 409 && data.alreadyPending) {
      return {
        ok: true,
        message: "A payment prompt is already on your phone — enter your M-Pesa PIN there to finish.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        reason:
          data.error ??
          (res.status === 401
            ? "Your session has expired. Please sign in again."
            : "We couldn't send the M-Pesa prompt. Please try again."),
      };
    }
    return { ok: true, message: data.message ?? "Check your phone and enter your M-Pesa PIN." };
  } catch (err) {
    return {
      ok: false,
      reason: isTimeout(err)
        ? "M-Pesa didn't respond in time. Please try again."
        : "Network error — check your connection and try again.",
    };
  }
}

/**
 * Polls the order until M-Pesa reports paid or failed (wrong PIN, cancelled,
 * timeout, low balance…), or gives up. `isAlive` lets a closed page stop.
 */
export async function waitForPaymentResult(
  orderId: string,
  isAlive: () => boolean = () => true
): Promise<{ outcome: "paid" } | { outcome: "failed"; reason: string } | { outcome: "timeout" | "cancelled" }> {
  const deadline = Date.now() + GIVE_UP_AFTER_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_EVERY_MS);
    if (!isAlive()) return { outcome: "cancelled" };

    try {
      const res = await fetch(`/api/mpesa/status?orderId=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { paymentStatus?: string; reason?: string | null };
      if (data.paymentStatus === "paid") return { outcome: "paid" };
      if (data.paymentStatus === "failed") {
        return { outcome: "failed", reason: data.reason ?? "The M-Pesa payment did not go through." };
      }
    } catch {
      // A dropped poll is fine; the next one tries again.
    }
  }
  return { outcome: "timeout" };
}

export function useMpesaPayment() {
  const [state, setState] = useState<MpesaPayState>({ phase: "idle" });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const pay = useCallback(async (orderId: string, phone: string): Promise<MpesaOutcome> => {
    setState({ phase: "sending" });

    const sent = await sendStkPrompt(orderId, phone);
    if (!sent.ok) {
      setState({ phase: "failed", reason: sent.reason });
      return "failed";
    }

    setState({ phase: "waiting", message: sent.message });
    const result = await waitForPaymentResult(orderId, () => alive.current);

    if (result.outcome === "cancelled") return "cancelled";
    if (!alive.current) return result.outcome;
    if (result.outcome === "paid") setState({ phase: "paid" });
    else if (result.outcome === "failed") setState({ phase: "failed", reason: result.reason });
    else setState({ phase: "timeout" });
    return result.outcome;
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, pay, reset };
}

/** Status line for the states worth showing; renders nothing when idle. */
export function MpesaStatus({ state }: { state: MpesaPayState }) {
  switch (state.phase) {
    case "sending":
      return (
        <StatusBox tone="info" icon="send_to_mobile">
          Sending the M-Pesa prompt to your phone…
        </StatusBox>
      );
    case "waiting":
      return (
        <StatusBox tone="info" icon="hourglass_top" spin>
          {state.message} Waiting for M-Pesa to confirm — keep this page open.
        </StatusBox>
      );
    case "paid":
      return (
        <StatusBox tone="success" icon="check_circle">
          Payment received. Thank you!
        </StatusBox>
      );
    case "failed":
      return (
        <StatusBox tone="error" icon="error">
          <strong>Payment failed:</strong> {state.reason} No money was taken — you can try again.
        </StatusBox>
      );
    case "timeout":
      return (
        <StatusBox tone="warn" icon="schedule">
          We haven&apos;t heard back from M-Pesa yet. If you entered your PIN, the payment will
          show on your orders page shortly; otherwise, try again from there.
        </StatusBox>
      );
    default:
      return null;
  }
}

/** A short headline for the failure reasons lib/mpesa.ts produces. */
function failureTitle(reason: string): string {
  if (/wrong .*pin/i.test(reason)) return "Wrong M-Pesa PIN";
  if (/pin is locked/i.test(reason)) return "M-Pesa PIN locked";
  if (/insufficient/i.test(reason)) return "Not enough M-Pesa balance";
  if (/cancelled/i.test(reason)) return "Payment cancelled";
  if (/timed out|expired|no response/i.test(reason)) return "Prompt timed out";
  if (/in progress/i.test(reason)) return "Another payment in progress";
  return "Payment failed";
}

/**
 * Full-screen payment progress: sending → enter your PIN → paid, or a red
 * failure card with the reason and a retry. Renders nothing while idle, and
 * can't be dismissed while M-Pesa is still working.
 */
export function MpesaPayModal({
  state,
  amount,
  phone,
  onRetry,
  onClose,
  onOrdersClick,
}: {
  state: MpesaPayState;
  amount?: number;
  phone?: string;
  onRetry?: () => void;
  onClose: () => void;
  /** Runs before following the "Go to my orders" link after a timeout. */
  onOrdersClick?: () => void;
}) {
  const open = state.phase !== "idle";
  const busy = state.phase === "sending" || state.phase === "waiting";

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  if (!open || typeof document === "undefined") return null;

  const failed = state.phase === "failed";
  const amountLine = amount != null ? formatKes(amount) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role={failed ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="mpesa-modal-title"
        aria-describedby="mpesa-modal-body"
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-[0_24px_60px_rgba(0,0,0,0.3)] dark:bg-surface ${
          failed ? "ring-2 ring-red-500/70" : ""
        }`}
      >
        {failed && <div className="h-1.5 bg-red-500" aria-hidden="true" />}
        {!busy && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}

        <div className="px-6 pb-6 pt-8">
          {busy && (
            <>
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
                <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" />
                <span className="material-symbols-outlined text-[34px] text-primary" aria-hidden="true">
                  {state.phase === "sending" ? "send_to_mobile" : "phone_iphone"}
                </span>
              </div>
              <h2 id="mpesa-modal-title" className="mt-5 text-lg font-semibold text-on-surface">
                {state.phase === "sending" ? "Sending M-Pesa prompt…" : "Enter your M-Pesa PIN"}
              </h2>
              <p id="mpesa-modal-body" className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {state.phase === "sending"
                  ? `Sending a payment request${phone ? ` to ${phone}` : ""}.`
                  : `Check your phone${phone ? ` (${phone})` : ""} and enter your PIN to pay${
                      amountLine ? ` ${amountLine}` : ""
                    }.`}
              </p>
              <p className="mt-4 rounded-xl bg-primary/5 px-3 py-2 text-xs text-on-surface-variant">
                Processing — keep this page open until M-Pesa confirms.
              </p>
            </>
          )}

          {state.phase === "paid" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                <span className="material-symbols-outlined text-[44px] text-green-600" aria-hidden="true">
                  check_circle
                </span>
              </div>
              <h2 id="mpesa-modal-title" className="mt-5 text-lg font-semibold text-on-surface">
                Payment received
              </h2>
              <p id="mpesa-modal-body" className="mt-2 text-sm text-on-surface-variant">
                {amountLine ? `${amountLine} paid. ` : ""}Thank you for shopping with Kelmon!
              </p>
            </>
          )}

          {failed && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
                <span className="material-symbols-outlined text-[44px] text-red-600" aria-hidden="true">
                  error
                </span>
              </div>
              <h2 id="mpesa-modal-title" className="mt-5 text-lg font-semibold text-red-600">
                {failureTitle(state.reason)}
              </h2>
              <p id="mpesa-modal-body" className="mt-2 text-sm leading-relaxed text-on-surface">
                {state.reason}
              </p>
              <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                No money was taken.
              </p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 rounded-xl border border-outline/40 text-sm font-medium text-on-surface transition hover:bg-black/5"
                >
                  Close
                </button>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    autoFocus
                    className="h-11 rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Try again
                  </button>
                )}
              </div>
            </>
          )}

          {state.phase === "timeout" && (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
                <span className="material-symbols-outlined text-[44px] text-amber-600" aria-hidden="true">
                  schedule
                </span>
              </div>
              <h2 id="mpesa-modal-title" className="mt-5 text-lg font-semibold text-on-surface">
                Still waiting for M-Pesa
              </h2>
              <p id="mpesa-modal-body" className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                If you entered your PIN, the payment will show on your orders page shortly.
                Otherwise, you can try again from there.
              </p>
              <Link
                href="/orders"
                onClick={onOrdersClick}
                className="mt-5 flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Go to my orders
              </Link>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const TONES = {
  info: "border-[#C5A059]/40 bg-[#C5A059]/10 text-on-surface",
  success: "border-green-500/40 bg-green-500/10 text-on-surface",
  error: "border-red-500/40 bg-red-500/10 text-on-surface",
  warn: "border-amber-500/40 bg-amber-500/10 text-on-surface",
} as const;

function StatusBox({
  tone,
  icon,
  spin,
  children,
}: {
  tone: keyof typeof TONES;
  icon: string;
  spin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${TONES[tone]}`}
    >
      <span
        className={`material-symbols-outlined text-[20px] ${spin ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
