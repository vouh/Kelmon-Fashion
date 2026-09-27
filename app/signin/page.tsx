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
      // Redirects away; the /auth/callback route finishes the exchange.
      await signInWithGoogle(nextPath);
    } catch (err) {
      setError(authErrorMessage(err));
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
        toast("Account created. Check your email to confirm.");
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

  if (!configured) {
    return (
      <div className="rounded-3xl border border-outline/40 bg-surface-container p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-error">cloud_off</span>
        <h2 className="mt-3 font-headline-sm text-headline-sm text-on-surface">
          Sign-in isn&apos;t configured
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Add <code className="font-mono text-[13px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono text-[13px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
          your <code className="font-mono text-[13px]">.env.local</code>, then restart the
          dev server.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-outline/40 bg-surface-container p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <Image src={logo} alt="Kelmon" width={48} height={48} className="rounded-full" />
        <h1 className="mt-4 font-display-md text-headline-lg text-on-surface">
          {mode === "signin" ? "Welcome back" : "Join Kelmon"}
        </h1>
        <p className="mt-1.5 text-body-md text-on-surface-variant">
          {mode === "signin"
            ? "Sign in to track orders and save your favourites."
            : "Create an account to check out faster and earn Kelmon Points."}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-2xl border border-error/30 bg-error/10 px-4 py-3"
        >
          <span className="material-symbols-outlined text-lg text-error">error</span>
          <p className="text-body-md text-error">{error}</p>
        </div>
      )}

      {/* Google is the primary path — free, no password to forget. */}
      <button
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
      </button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-outline/40" />
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
          or
        </span>
        <span className="h-px flex-1 bg-outline/40" />
      </div>

      <form onSubmit={handleEmail} className="space-y-3">
        {mode === "signup" && (
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            required
            className="w-full rounded-2xl border border-outline/50 bg-surface px-4 py-3 text-body-md text-on-surface outline-none transition focus:border-primary"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-outline/50 bg-surface px-4 py-3 text-body-md text-on-surface outline-none transition focus:border-primary"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={6}
          required
          className="w-full rounded-2xl border border-outline/50 bg-surface px-4 py-3 text-body-md text-on-surface outline-none transition focus:border-primary"
        />

        <button
          type="submit"
          disabled={busy !== null}
          className="w-full rounded-full bg-primary px-5 py-3.5 font-button-text text-button-text text-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          {busy === "email"
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-body-md text-on-surface-variant">
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

      <p className="mt-6 text-center text-[12px] leading-relaxed text-on-surface-variant">
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
      <section className="mx-auto w-full max-w-md px-margin-mobile py-lg sm:px-0">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-outline/40 bg-surface-container p-8 text-center text-on-surface-variant">
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
