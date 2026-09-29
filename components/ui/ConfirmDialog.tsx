"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Branded replacement for window.confirm().
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete category?", tone: "danger" })) { … }
 *
 * Resolves true on confirm, false on cancel, Escape or a click outside. Unlike
 * window.confirm it doesn't freeze the page, and it looks like the rest of the
 * site instead of "www.kelmonfashion.com says".
 */

export interface ConfirmOptions {
  title: string;
  /** Extra detail under the title. */
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for irreversible actions like deleting. */
  tone?: "default" | "danger";
  /** Material Symbols icon name; a sensible one is picked from the tone. */
  icon?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(
    null
  );

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setRequest({ ...options, resolve });
      }),
    []
  );

  const close = useCallback(
    (ok: boolean) => {
      request?.resolve(ok);
      setRequest(null);
    },
    [request]
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmModal options={request} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({
  options,
  onClose,
}: {
  options: ConfirmOptions;
  onClose: (ok: boolean) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = options.tone === "danger";
  const icon = options.icon ?? (danger ? "delete" : "help");

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm animate-[confirm-fade_0.15s_ease-out] sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={options.message ? "confirm-message" : undefined}
        className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(30,10,45,0.35)] animate-[confirm-pop_0.18s_cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-zinc-900"
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              danger
                ? "bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400"
                : "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300"
            }`}
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-title" className="text-base font-semibold text-zinc-900 dark:text-white">
              {options.title}
            </h2>
            {options.message && (
              <div id="confirm-message" className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-white/60">
                {options.message}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5"
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={`h-10 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
              danger
                ? "bg-red-600 hover:bg-red-500 focus-visible:ring-red-500"
                : "bg-purple-600 hover:bg-purple-500 focus-visible:ring-purple-500"
            }`}
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
