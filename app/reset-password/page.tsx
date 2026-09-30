"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import AppShell from "@/components/layout/AppShell";
import { useAuth, authErrorMessage } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useAuthModal } from "@/components/auth/AuthModal";
import { getFirebaseAuth } from "@/lib/firebase/client";
import logo from "@/lib/logo";
import { passwordProblem } from "@/lib/validation/credentials";

type Status = "checking" | "ready" | "invalid";

// Matches the sign-in window, so both password forms look and behave alike.
const inputClass =
  "h-10 w-full rounded-xl border border-outline/40 bg-surface px-3.5 text-sm sm:h-11 text-on-surface outline-none transition placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/15";
const invalidClass = "!border-red-400 focus:!border-red-500 focus:!ring-red-500/20";
const primaryButton =
  "flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary sm:h-11 text-sm font-semibold text-on-primary transition hover:bg-primary/90 disabled:opacity-60";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { configured, signInWithEmail } = useAuth();
  const { toast } = useToast();
  const { openAuth } = useAuthModal();

  const oobCode = params.get("oobCode");
  /** Invite links reuse the reset flow; only the wording and landing page differ. */
  const invite = params.get("mode") === "invite";

  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  /** Hints stay hidden until the field is left or the form is sent. */
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const passwordHint = passwordTouched ? passwordProblem(password) : null;
  const confirmHint = confirmTouched && confirm !== password ? "The passwords don't match." : null;

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
    setPasswordTouched(true);
    setConfirmTouched(true);
    if (passwordProblem(password) || password !== confirm) return;

    setBusy(true);
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
      return;
    }

    try {
      const result = await signInWithEmail(email, password);
      toast(invite ? "You're all set. Welcome to Kelmon!" : "Password updated. Welcome back!");
      router.push(result.admin ? "/admin" : "/profile");
      router.refresh();
    } catch {
      toast("Password saved. Please sign in.");
      openAuth({ next: "/profile" });
    }
  }

  return (
    <div className="relative w-full max-w-[350px] rounded-2xl bg-white px-4 py-5 shadow-[0_24px_60px_rgba(45,20,70,0.18)] sm:max-w-[440px] sm:rounded-3xl sm:px-8 sm:py-7 dark:bg-surface">
      <div className="flex flex-col items-center text-center">
        <Image src={logo} alt="Kelmon" width={48} height={48} className="h-9 w-9 object-contain sm:h-12 sm:w-12" />
        <h1 className="mt-2 text-base font-semibold text-on-surface sm:text-lg">
          {invite ? "Set up your account" : "Choose a new password"}
        </h1>
        <p className="mt-0.5 text-xs text-on-surface-variant sm:text-sm">
          {status === "ready"
            ? invite
              ? <>Create a password for <strong className="text-on-surface">{email}</strong></>
              : <>For <strong className="text-on-surface">{email}</strong></>
            : status === "checking"
              ? "Checking your reset link…"
              : "This link can't be used."}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {status === "ready" && (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => password && setPasswordTouched(true)}
                placeholder={invite ? "Create a password" : "New password"}
                aria-label={invite ? "Create a password" : "New password"}
                aria-invalid={passwordHint ? true : undefined}
                aria-describedby={passwordHint ? "reset-password-hint" : undefined}
                autoComplete="new-password"
                maxLength={128}
                autoFocus
                className={`${inputClass} pr-11 ${passwordHint ? invalidClass : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-1 my-auto flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {passwordHint && (
              <p id="reset-password-hint" role="alert" className="mt-1 px-1 text-[11px] leading-snug text-red-600">
                {passwordHint}
              </p>
            )}
          </div>
          <div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => confirm && setConfirmTouched(true)}
              placeholder="Confirm password"
              aria-label="Confirm password"
              aria-invalid={confirmHint ? true : undefined}
              aria-describedby={confirmHint ? "reset-confirm-hint" : undefined}
              autoComplete="new-password"
              maxLength={128}
              className={`${inputClass} ${confirmHint ? invalidClass : ""}`}
            />
            {confirmHint && (
              <p id="reset-confirm-hint" role="alert" className="mt-1 px-1 text-[11px] leading-snug text-red-600">
                {confirmHint}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Saving…" : invite ? "Create password and sign in" : "Save and sign in"}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>
      )}

      {status === "invalid" && (
        <Link href="/forgot-password" className={`${primaryButton} mt-4`}>
          Request a new link
        </Link>
      )}

      <p className="mt-4 text-center text-xs text-on-surface-variant">
        <button
          type="button"
          onClick={() => openAuth({ next: "/profile" })}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </button>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AppShell activeNav="profile">
      <section className="relative mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-xl items-center justify-center px-margin-mobile py-8 sm:px-0">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <Suspense
          fallback={
            <div className="w-full max-w-[350px] rounded-2xl bg-white p-6 text-center text-sm text-on-surface-variant sm:max-w-[440px] dark:bg-surface">
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
