"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatKes } from "@/components/admin/ui";
import { createDirectOrder } from "@/app/admin/actions";
import { sendStkPrompt, waitForPaymentResult } from "@/components/payments/MpesaPayment";

type Step = "form" | "sending" | "waiting" | "paid" | "failed";

// text-base on phones: iOS zooms the page into any input under 16px.
const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-3 text-base text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none disabled:opacity-60 sm:text-sm";

/**
 * Quick STK: just a phone number and an amount. Saves a placeholder order —
 * flagged with a yellow "!" in the orders list — and prompts the customer.
 * The client and products are linked to it later, from that "!".
 */
export default function QuickStkButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  /** False once the popup closes, so a pending wait stops polling. */
  const alive = useRef(false);

  const busy = step === "sending";
  const value = Number(amount);

  function close() {
    if (busy) return;
    alive.current = false;
    const hadOrder = orderId !== null;
    setOpen(false);
    setPhone("");
    setAmount("");
    setStep("form");
    setError(null);
    setOrderId(null);
    setFailReason(null);
    if (hadOrder) router.refresh();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close() only reads state that is current on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy, orderId]);

  useEffect(() => () => {
    alive.current = false;
  }, []);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!(value > 0)) return setError("Enter the amount.");

    setStep("sending");
    let id = orderId;
    try {
      if (!id) {
        const result = await createDirectOrder({
          customerName: "Walk-in customer",
          phone,
          dropPoint: "Road sale",
          notes: "Quick STK. Link the client and product later.",
          items: [{ name: "Quick payment", price: value, quantity: 1 }],
        });
        if (!result.ok) {
          setError(result.error);
          setStep("form");
          return;
        }
        id = result.orderId;
        setOrderId(id);
      }

      const sent = await sendStkPrompt(id, phone);
      if (!sent.ok) {
        setError(`${sent.reason} The order ${id} was saved, so you can try again.`);
        setStep("form");
        return;
      }

      setStep("waiting");
      alive.current = true;
      const outcome = await waitForPaymentResult(id, () => alive.current);
      if (outcome.outcome === "cancelled") return;
      if (outcome.outcome === "paid") setStep("paid");
      else {
        setFailReason(
          outcome.outcome === "failed"
            ? outcome.reason
            : "No answer from M-Pesa yet. Check the order later, or resend from the orders list."
        );
        setStep("failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the M-Pesa prompt.");
      setStep("form");
    }
  }

  const status = {
    waiting: {
      icon: "hourglass_top",
      color: "text-amber-300 bg-amber-400/15",
      title: "Waiting for the customer",
      body: `Prompt sent to ${phone}. Ask them to enter their M-Pesa PIN.`,
    },
    paid: {
      icon: "check_circle",
      color: "text-green-300 bg-green-400/15",
      title: "Paid",
      body: `${formatKes(value)} received. Tap the yellow ! on the order later to link the client and product.`,
    },
    failed: {
      icon: "cancel",
      color: "text-red-300 bg-red-400/15",
      title: "Not paid",
      body: failReason ?? "The payment didn't go through.",
    },
  } as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border-2 border-purple-500 bg-purple-500/15 px-3 py-2 sm:px-4 text-xs font-black uppercase tracking-widest text-purple-300 transition hover:bg-purple-500/25"
      >
        <span className="material-symbols-outlined text-lg">send_to_mobile</span>
        Quick STK
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 cursor-default" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-stk-title"
            className="relative w-full rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl max-w-sm"
          >
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <h2 id="quick-stk-title" className="flex-1 text-sm font-black text-white">
                Quick STK
              </h2>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="-mr-1 rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-40"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {step === "waiting" || step === "paid" || step === "failed" ? (
              <div className="space-y-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-center">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${status[step].color}`}>
                  <span className={`material-symbols-outlined text-3xl ${step === "waiting" ? "animate-pulse" : ""}`}>
                    {status[step].icon}
                  </span>
                </div>
                <div>
                  <p className="text-base font-black text-white">{status[step].title}</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-white/50">{status[step].body}</p>
                  {orderId && <p className="mt-3 font-mono text-[10px] text-white/25">{orderId}</p>}
                </div>
                <div className="space-y-2">
                  {step === "failed" && (
                    <button
                      type="button"
                      onClick={() => {
                        setFailReason(null);
                        setStep("form");
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      Try again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="w-full rounded-xl bg-white/10 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15"
                  >
                    {step === "waiting" ? "Close. It'll update in the orders list" : "Done"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  autoFocus
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Customer M-Pesa number"
                  disabled={orderId !== null}
                  aria-label="Customer M-Pesa number"
                  className={inputClass}
                />
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-white/40">
                    KES
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    disabled={orderId !== null}
                    aria-label="Amount in KES"
                    className={`${inputClass} pl-12 text-lg font-black`}
                  />
                </div>
                {error && (
                  <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">send_to_mobile</span>
                  {busy ? "Sending…" : orderId ? "Resend prompt" : value > 0 ? `Send ${formatKes(value)}` : "Send prompt"}
                </button>
                <p className="text-center text-[10px] text-white/30">
                  Saved with a yellow ! so you can link the client and product later.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
