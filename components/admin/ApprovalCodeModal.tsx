"use client";

import { useEffect, useRef, useState } from "react";
import { confirmPaymentDeletion, requestPaymentDeletion } from "@/app/admin/bulk-actions";

/**
 * Deleting payment records: asks the server to email a one-time code to the
 * super admins, then takes that code to carry out the deletion.
 */
export default function ApprovalCodeModal({
  orderIds,
  failureIds,
  summary,
  onClose,
  onDone,
}: {
  orderIds: string[];
  failureIds: string[];
  /** e.g. "3 payments" — shown in the title. */
  summary: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [step, setStep] = useState<"confirm" | "sending" | "code" | "deleting">("confirm");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = step === "sending" || step === "deleting";

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, onClose]);

  useEffect(() => {
    if (step === "code") inputRef.current?.focus();
  }, [step]);

  async function sendCode() {
    setError(null);
    setStep("sending");
    const result = await requestPaymentDeletion({ orderIds, failureIds });
    if (!result.ok) {
      setError(result.error);
      setStep("confirm");
      return;
    }
    setRequestId(result.requestId);
    setSentTo(result.sentTo);
    setMinutes(result.minutes);
    setCode("");
    setStep("code");
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!requestId) return;
    setError(null);
    setStep("deleting");
    const result = await confirmPaymentDeletion(requestId, code);
    if (!result.ok) {
      setError(result.error);
      setStep("code");
      return;
    }
    onDone(result.message);
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/65 backdrop-blur-sm animate-[confirm-fade_0.15s_ease-out] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        className="w-full rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-[confirm-pop_0.18s_cubic-bezier(0.22,1,0.36,1)] sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <span className="material-symbols-outlined text-[22px]">{step === "code" || step === "deleting" ? "password" : "lock"}</span>
          </span>
          <div className="min-w-0">
            <h2 id="approval-title" className="text-base font-semibold text-white">
              Delete {summary}?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">
              {step === "code" || step === "deleting" ? (
                <>
                  We emailed a 6-digit approval code to {sentTo === 1 ? "the super admin" : `${sentTo} super admins`}.
                  Enter it to delete. It works once and expires in {minutes} minutes.
                </>
              ) : (
                <>
                  Payment records are protected. To delete them, a one-time code is emailed to the super
                  admins — enter it here to confirm. This can&apos;t be undone
                  {orderIds.length > 0 && ", and deleting a paid payment deletes its order too"}.
                </>
              )}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300" role="alert">
            {error}
          </p>
        )}

        {step === "code" || step === "deleting" ? (
          <form onSubmit={confirm} className="mt-5 space-y-3">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              aria-label="6-digit approval code"
              className="w-full rounded-xl border border-white/15 bg-zinc-800 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.5em] text-white placeholder:text-white/20 focus:border-red-400/60 focus:outline-none"
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={busy}
                className="h-10 rounded-xl px-3 text-xs font-semibold text-white/50 hover:text-white disabled:opacity-50"
              >
                Send a new code
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/80 hover:bg-white/5">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="h-10 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {step === "deleting" ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/80 hover:bg-white/5">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={busy}
              className="h-10 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {step === "sending" ? "Sending code…" : "Email the approval code"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
