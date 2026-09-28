"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import AppShell from "@/components/layout/AppShell";
import { useAuth, authErrorMessage } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { getFirebaseAuth } from "@/lib/firebase/client";
import logo from "@/lib/logo";

type Status = "checking" | "ready" | "invalid";

const inputClass =
  "w-full rounded-2xl border border-outline/50 bg-surface px-4 py-3.5 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { configured, signInWithEmail } = useAuth();
  const { toast } = useToast();

  const oobCode = params.get("oobCode");

  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode || !configured) {
      setStatus("invalid");
      setError(
        oobCode
          ? "Password reset is unavailable right now. Please try again later."
          : "This reset link is missing its code. Request a new one."
      );
      return;
    }

    let cancelled = false;
    verifyPasswordResetCode(getFirebaseAuth(), oobCode)
      .then((accountEmail) => {
        if (cancelled) return;
        setEmail(accountEmail);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(authErrorMessage(err));
        setStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [oobCode, configured]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!oobCode) return;
    setError(null);

    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
      return;
    }

    try {
      await signInWithEmail(email, password);
      toast("Password updated. Welcome back!");
      router.push("/profile");
      router.refresh();
    } catch {
      toast("Password updated. Please sign in.");
      router.push("/signin");
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border border-primary/20 bg-white/90 p-6 shadow-[0_24px_70px_rgba(91,42,128,0.18)] backdrop-blur sm:p-9 dark:bg-surface/90">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-secondary/25 blur-2xl" />
      <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />

      <div className="relative flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-white shadow-lg shadow-primary/10 dark:bg-surface-container">
          <Image src={logo} alt="Kelmon" width={54} height={54} className="h-12 w-12 object-contain" />
        </div>
        <h1 className="mt-5 font-display-md text-3xl text-on-surface sm:text-4xl">Choose a new password</h1>
        <p className="mt-2 max-w-sm text-body-md leading-relaxed text-on-surface-variant">
          {status === "ready"
            ? <>For <strong className="text-on-surface">{email}</strong></>
            : status === "checking"
              ? "Checking your reset link…"
              : "This link can't be used."}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="relative mt-6 flex items-start gap-2 rounded-2xl border border-error/30 bg-error/10 px-4 py-3"
        >
          <span className="material-symbols-outlined text-lg text-error">error</span>
          <p className="text-body-md text-error">{error}</p>
        </div>
      )}

      {status === "ready" && (
        <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-on-surface">
              <span>New password</span>
              <span className="font-normal text-on-surface-variant">6+ characters</span>
            </span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" minLength={6} required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-on-surface">Confirm new password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" minLength={6} required className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-button-text text-button-text text-on-primary shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save and sign in"}
            <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
          </button>
        </form>
      )}

      {status === "invalid" && (
        <Link
          href="/forgot-password"
          className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-button-text text-button-text text-on-primary shadow-lg shadow-primary/25 transition hover:bg-primary/90"
        >
          Request a new link
        </Link>
      )}

      <p className="relative mt-6 text-center text-body-md text-on-surface-variant">
        <Link href="/signin" className="font-semibold text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AppShell activeNav="profile">
      <section className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-xl items-center px-margin-mobile py-12 sm:px-0">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <Suspense
          fallback={
            <div className="w-full rounded-[2rem] border border-outline/40 bg-surface-container p-8 text-center text-on-surface-variant">
              Loading…
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </section>
    </AppShell>
  );
}
