"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth, authErrorMessage } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import logo from "@/lib/logo";

type Mode = "signin" | "signup";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, configured } = useAuth();
  const { toast } = useToast();

  const nextPath = params.get("next") ?? "/profile";
  const initialError = params.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? decodeURIComponent(initialError) : null
  );

  async function handleGoogle() {
    setError(null);
    setBusy("google");
    try {
      // A popup, so the caller stays on this page and finishes below.
      await signInWithGoogle();
      toast("Welcome!");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("email");

    try {
      if (mode === "signup") {
        if (!fullName.trim()) throw new Error("Please enter your name.");
        await signUpWithEmail(email.trim(), password, fullName.trim());
        toast("Account created. Welcome to Kelmon!");
      } else {
        await signInWithEmail(email.trim(), password);
        toast("Welcome back!");
      }
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-white/90 p-6 shadow-[0_24px_70px_rgba(91,42,128,0.18)] backdrop-blur sm:p-9 dark:bg-surface/90">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-secondary/25 blur-2xl" />
      <div className="absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />

      <div className="relative flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-white shadow-lg shadow-primary/10 dark:bg-surface-container">
          <Image src={logo} alt="Kelmon" width={54} height={54} className="h-12 w-12 object-contain" />
        </div>
        <span className="mt-5 rounded-full bg-primary/10 px-3 py-1 font-label-caps text-[10px] uppercase tracking-[0.2em] text-primary">
          Your Kelmon account
        </span>
        <h1 className="mt-3 font-display-md text-3xl text-on-surface sm:text-4xl">
          {mode === "signin" ? "Welcome back" : "Join Kelmon"}
        </h1>
        <p className="mt-2 max-w-sm text-body-md leading-relaxed text-on-surface-variant">
          {mode === "signin"
            ? "Sign in to track orders and save your favourites."
            : "Create an account to check out faster and earn Kelmon Points."}
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

      {!configured && (
        <div
          role="alert"
          className="relative mt-6 flex gap-3 rounded-2xl border border-error/30 bg-error/10 px-4 py-3.5 text-left text-sm text-on-surface-variant"
        >
          <span className="material-symbols-outlined mt-0.5 text-error">key_off</span>
          <p>
            <strong className="text-on-surface">Sign-in is unavailable</strong>
            <br />
            Firebase credentials are missing. Add the{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_FIREBASE_*</code> values to{" "}
            <code className="font-mono text-xs">.env.local</code> and restart the dev server.
          </p>
        </div>
      )}

      {/* Google is available only once Firebase credentials are present. */}
      {configured && <button
        type="button"
        onClick={handleGoogle}
        disabled={busy !== null}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-outline/60 bg-surface px-5 py-3.5 font-button-text text-button-text text-on-surface transition hover:bg-surface-container-high disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
          />
          <path
            fill="#FBBC05"
            d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
          />
        </svg>
        {busy === "google" ? "Redirecting…" : "Continue with Google"}
      </button>}

      {configured && <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-outline/40" />
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
          or
        </span>
        <span className="h-px flex-1 bg-outline/40" />
      </div>}

      <form onSubmit={handleEmail} className="relative mt-6 space-y-4">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-on-surface">Full name</span>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Amina Wanjiku" autoComplete="name" required className="w-full rounded-2xl border border-outline/50 bg-surface px-4 py-3.5 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-on-surface">Email address</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className="w-full rounded-2xl border border-outline/50 bg-surface px-4 py-3.5 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10" />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-on-surface"><span>Password</span>{mode === "signup" && <span className="font-normal text-on-surface-variant">6+ characters</span>}</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required className="w-full rounded-2xl border border-outline/50 bg-surface px-4 py-3.5 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-4 focus:ring-primary/10" />
        </label>

        <button
          type="submit"
          disabled={busy !== null || !configured}
          className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-button-text text-button-text text-on-primary shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60"
        >
          {busy === "email"
            ? "Please wait…"
            : mode === "signin"
              ? "Enter Kelmon"
              : "Create account"}
          <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
        </button>
      </form>

      <p className="relative mt-6 text-center text-body-md text-on-surface-variant">
        {mode === "signin" ? "New to Kelmon?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>

      <p className="relative mt-7 text-center text-[12px] leading-relaxed text-on-surface-variant">
        By continuing you agree to Kelmon&apos;s{" "}
        <Link href="/about" className="underline underline-offset-2">
          terms
        </Link>
        .
      </p>
    </div>
  );
}

export default function SignInPage() {
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
          <SignInForm />
        </Suspense>
      </section>
    </AppShell>
  );
}
