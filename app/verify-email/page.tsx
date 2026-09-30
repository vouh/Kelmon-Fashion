"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { useAuthModal } from "@/components/auth/AuthModal";
import logo from "@/lib/logo";
import { SIGNUP_CHANNEL } from "@/lib/signup-verify";

type Status = "checking" | "verified" | "created" | "invalid";

/**
 * Where the "Verify my email" button in the sign-up email lands. It confirms
 * the email; the sign-up window that sent the code notices and creates the
 * account there, because only that window has the password.
 */
function VerifyEmail() {
  const { openAuth } = useAuthModal();
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Once only, even under Strict Mode's double effect in development.
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") ?? "";
    const code = params.get("code") ?? "";
    // Drop the code from the address bar and history once it's been read.
    window.history.replaceState(null, "", "/verify-email");

    fetch("/api/auth/signup-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, code }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          email?: string;
          alreadyCreated?: boolean;
          error?: string;
        };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "We could not verify your email.");
        setEmail(data.email ?? "");
        setStatus(data.alreadyCreated ? "created" : "verified");
        try {
          const channel = new BroadcastChannel(SIGNUP_CHANNEL);
          channel.postMessage({ id });
          channel.close();
        } catch {}
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "We could not verify your email.");
        setStatus("invalid");
      });
  }, []);

  const heading =
    status === "checking"
      ? "Verifying your email…"
      : status === "invalid"
        ? "This link can't be used"
        : "Email verified";

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-primary/20 bg-white/90 p-6 text-center shadow-[0_24px_70px_rgba(91,42,128,0.18)] backdrop-blur sm:p-9 dark:bg-surface/90">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-secondary/25 blur-2xl" />
      <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />

      <div className="relative flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-white shadow-lg shadow-primary/10 dark:bg-surface-container">
          <Image src={logo} alt="Kelmon" width={54} height={54} className="h-12 w-12 object-contain" />
        </div>
        <span
          className={`material-symbols-outlined mt-5 text-4xl ${status === "invalid" ? "text-error" : "text-primary"}`}
          aria-hidden="true"
        >
          {status === "checking" ? "hourglass_top" : status === "invalid" ? "error" : "verified"}
        </span>
        <h1 className="mt-2 font-display-md text-3xl text-on-surface sm:text-4xl">{heading}</h1>

        {status === "verified" && (
          <p className="mt-3 max-w-sm text-body-md leading-relaxed text-on-surface-variant">
            {email ? <><strong className="text-on-surface">{email}</strong> is confirmed. </> : null}
            Go back to the Kelmon window where you signed up — your account is being created there
            automatically. You can close this tab.
          </p>
        )}
        {status === "created" && (
          <p className="mt-3 max-w-sm text-body-md leading-relaxed text-on-surface-variant">
            Your account is ready. Sign in to start shopping.
          </p>
        )}
        {status === "invalid" && (
          <p role="alert" className="mt-3 max-w-sm text-body-md leading-relaxed text-error">
            {error} You can still type the six-digit code from the email into the sign-up window.
          </p>
        )}
      </div>

      {(status === "created" || status === "invalid") && (
        <button
          type="button"
          onClick={() => openAuth({ mode: status === "created" ? "signin" : "signup", next: "/profile" })}
          className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-button-text text-button-text text-on-primary shadow-lg shadow-primary/25 transition hover:bg-primary/90"
        >
          {status === "created" ? "Sign in" : "Start sign-up again"}
        </button>
      )}
      {status === "verified" && (
        <p className="relative mt-6 text-xs text-on-surface-variant">
          Closed the sign-up window?{" "}
          <button
            type="button"
            onClick={() => openAuth({ mode: "signup", next: "/profile" })}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Start again
          </button>
        </p>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AppShell activeNav="profile">
      <section className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-xl items-center px-margin-mobile py-12 sm:px-0">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <Suspense fallback={null}>
          <VerifyEmail />
        </Suspense>
      </section>
    </AppShell>
  );
}
