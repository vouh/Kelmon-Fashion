"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth, authErrorMessage, type SignInResult } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { EMAIL_PATTERN, passwordProblem } from "@/lib/validation/credentials";
import logo from "@/lib/logo";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createClient } from "@/lib/supabase/client";
import { isProfileComplete } from "@/lib/kenya";

/** Whether the signed-in user has told us their county and location yet. */
async function profileHasLocation(): Promise<boolean> {
  try {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) return true;
    const { data } = await createClient()
      .from("profiles")
      .select("county, location")
      .eq("id", uid)
      .maybeSingle();
    return isProfileComplete(data);
  } catch {
    // If we can't tell, don't block them.
    return true;
  }
}

type Mode = "signin" | "signup";
type View = Mode | "forgot";

interface OpenAuthOptions {
  mode?: View;
  /** Where to send the user once signed in. Omit to stay on the current page. */
  next?: string;
  /** A notice shown above the form, e.g. why sign-in is needed. */
  message?: string;
}

interface AuthModalContextValue {
  openAuth: (options?: OpenAuthOptions) => void;
  closeAuth: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside AuthModalProvider");
  return ctx;
}

function safeNext(value: string | null | undefined): string | undefined {
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

/**
 * Opens the modal for `?auth=signin` / `?auth=signup` / `?auth=forgot` links
 * (the middleware's /admin gate, the old /signin and /forgot-password URLs all
 * land here), then strips the params.
 */
function AuthQueryWatcher({ onOpen }: { onOpen: (options: OpenAuthOptions) => void }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user, ensureSession } = useAuth();

  useEffect(() => {
    const auth = params.get("auth");
    if ((auth !== "signin" && auth !== "signup" && auth !== "forgot") || loading) return;

    const next = safeNext(params.get("next"));
    const rest = new URLSearchParams(params.toString());
    rest.delete("auth");
    rest.delete("next");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    if (user) {
      // Signed in to Firebase but the server cookie had lapsed: mint a fresh
      // token and carry on to where the user was headed.
      void ensureSession().then((ok) => {
        if (ok && next) router.push(next);
      });
      return;
    }
    onOpen({ mode: auth, next });
  }, [params, pathname, router, loading, user, ensureSession, onOpen]);

  return null;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<OpenAuthOptions | null>(null);
  // Bumped on each open so the form remounts with fresh state.
  const [openCount, setOpenCount] = useState(0);

  const openAuth = useCallback((next: OpenAuthOptions = {}) => {
    setOptions(next);
    setOpenCount((n) => n + 1);
  }, []);
  const closeAuth = useCallback(() => setOptions(null), []);

  const value = useMemo(() => ({ openAuth, closeAuth }), [openAuth, closeAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <AuthQueryWatcher onOpen={openAuth} />
      </Suspense>
      {options && <AuthModal key={openCount} options={options} onClose={closeAuth} />}
    </AuthModalContext.Provider>
  );
}

function AuthModal({ options, onClose }: { options: OpenAuthOptions; onClose: () => void }) {
  const [busy, setBusy] = useState<"google" | "email" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-[350px] rounded-2xl bg-white px-4 py-4 shadow-[0_24px_60px_rgba(45,20,70,0.25)] sm:max-w-[600px] sm:rounded-3xl sm:px-8 sm:py-7 dark:bg-surface"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy !== null}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-primary/10 hover:text-primary disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
        <AuthForm options={options} busy={busy} setBusy={setBusy} onClose={onClose} />
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-outline/40 bg-surface px-3.5 text-sm sm:h-11 text-on-surface outline-none transition placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/15";
const primaryButton =
  "flex h-10 w-full items-center justify-center rounded-xl bg-primary sm:h-11 text-sm font-semibold text-on-primary transition hover:bg-primary/90 disabled:opacity-60";
const linkButton = "font-semibold text-primary hover:underline underline-offset-4";

function AuthForm({
  options,
  busy,
  setBusy,
  onClose,
}: {
  options: OpenAuthOptions;
  busy: "google" | "email" | null;
  setBusy: (busy: "google" | "email" | null) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail, acceptTerms, configured } = useAuth();
  const { toast } = useToast();

  const next = options.next;
  const [view, setView] = useState<View>(options.mode ?? "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  /** Set after leaving the password field or submitting, so the hint doesn't nag while typing. */
  const [passwordTouched, setPasswordTouched] = useState(false);
  /** Required before creating an email account or continuing with Google. */
  const [agreed, setAgreed] = useState(false);
  /** Set when Google was clicked before ticking the box, which highlights it. */
  const [termsNudge, setTermsNudge] = useState(false);
  const termsRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [signupChallenge, setSignupChallenge] = useState<{ id: string; email: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  /** Set once an admin signs in, which swaps the form for the destination prompt. */
  const [adminRole, setAdminRole] = useState<SignInResult | null>(null);
  const passwordHint = view === "signup" && passwordTouched ? passwordProblem(password) : null;

  function switchView(to: View) {
    setView(to);
    setError(null);
    setResetSentTo(null);
    setSignupChallenge(null);
    setVerificationCode("");
    setPasswordTouched(false);
  }

  function finish(path?: string) {
    onClose();
    if (path) router.push(path);
    router.refresh();
  }

  /**
   * Admins headed for /admin go straight there. A plain sign-in (account icon)
   * asks admins whether to open the dashboard; one opened mid-action (Buy Now,
   * checkout, a like) always closes so the shopper can carry on.
   */
  async function routeAfterSignIn(result: SignInResult, isNewAccount = false) {
    if (result.admin && !options.message && !next?.startsWith("/admin")) {
      setAdminRole(result);
      return;
    }
    // Heading somewhere specific, or signed in mid-action (checkout, Buy Now,
    // a like): carry on — checkout asks for county and location itself.
    if (next || options.message) {
      finish(next);
      return;
    }
    // New accounts, and anyone whose county/location is still missing, land on
    // their profile with the details form open.
    if (isNewAccount || !(await profileHasLocation())) {
      finish("/profile?complete=1");
      return;
    }
    finish();
  }

  async function handleGoogle() {
    setError(null);
    // Google can create an account in one step, so the terms box must be
    // ticked before the Google window opens at all.
    if (!agreed) {
      setTermsNudge(true);
      termsRef.current?.focus();
      return;
    }
    setBusy("google");
    try {
      const result = await signInWithGoogle();
      // Records acceptance on a first Google sign-in; existing records are
      // left as they were.
      await acceptTerms();
      toast("Welcome!");
      await routeAfterSignIn(result);
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
      let result: SignInResult;
      if (view === "signup") {
        if (!fullName.trim()) throw new Error("Please enter your name.");
        if (fullName.trim().length > 120) throw new Error("Your name must be 120 characters or fewer.");
        if (!EMAIL_PATTERN.test(email.trim())) throw new Error("Please enter a valid email address.");
        if (passwordProblem(password)) {
          setPasswordTouched(true);
          return;
        }
        if (!agreed) throw new Error("Please accept the Terms of Service and Privacy Policy.");
        const response = await fetch("/api/auth/signup-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = (await response.json().catch(() => ({}))) as { challengeId?: string; error?: string };
        if (!response.ok || !data.challengeId) throw new Error(data.error ?? "We could not send the verification code.");
        setSignupChallenge({ id: data.challengeId, email: email.trim().toLowerCase() });
        toast("Verification code sent.");
        return;
      } else {
        result = await signInWithEmail(email.trim(), password);
        toast("Welcome back!");
      }
      await routeAfterSignIn(result);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  /** Creates the account once the six-digit code from the email checks out. */
  async function handleSignupVerification(event: React.FormEvent) {
    event.preventDefault();
    if (!signupChallenge) return;
    setError(null);
    setBusy("email");
    try {
      const response = await fetch("/api/auth/signup-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: signupChallenge.id,
          code: verificationCode,
          email: signupChallenge.email,
          password,
          fullName: fullName.trim(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We could not verify that code.");
      const result = await signInWithEmail(signupChallenge.email, password);
      await acceptTerms();
      toast("Email verified. Welcome to Kelmon!");
      await routeAfterSignIn(result, true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function resendSignupCode() {
    if (!signupChallenge) return;
    setError(null);
    setBusy("email");
    try {
      const response = await fetch("/api/auth/signup-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupChallenge.email }),
      });
      const data = (await response.json().catch(() => ({}))) as { challengeId?: string; error?: string };
      if (!response.ok || !data.challengeId) throw new Error(data.error ?? "We could not resend the code.");
      setSignupChallenge({ id: data.challengeId, email: signupChallenge.email });
      setVerificationCode("");
      toast("A new verification code was sent.");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy("email");
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setResetSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (adminRole) {
    return (
      <AdminDestinationPrompt
        superAdmin={adminRole.superAdmin}
        onAdmin={() => finish("/admin")}
        onCustomer={() => finish(next)}
      />
    );
  }

  const title =
    signupChallenge ? "Verify your email" : view === "signin" ? "Sign in" : view === "signup" ? "Create account" : "Reset password";

  const termsBox = (
    <div>
      <label
        className={`flex cursor-pointer items-start gap-2 rounded-xl px-2.5 py-1.5 text-[11px] leading-snug text-on-surface transition sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-xs sm:leading-relaxed ${
          termsNudge && !agreed ? "bg-red-500/10 ring-1 ring-red-400" : "bg-primary/5"
        }`}
      >
        <input
          ref={termsRef}
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            if (e.target.checked) setTermsNudge(false);
          }}
          required={view === "signup"}
          aria-invalid={termsNudge && !agreed ? true : undefined}
          aria-describedby={termsNudge && !agreed ? "terms-hint" : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span>
          I agree to Kelmon&apos;s{" "}
          <Link href="/terms" target="_blank" className={linkButton}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className={linkButton}>
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {termsNudge && !agreed && (
        <p id="terms-hint" role="alert" className="mt-1 px-1 text-[11px] leading-snug text-red-600">
          Please tick the box to agree to the Terms and Privacy Policy before continuing with Google.
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col items-center text-center sm:flex-row sm:gap-3 sm:pr-8 sm:text-left">
        <Image
          src={logo}
          alt="Kelmon"
          width={48}
          height={48}
          className="h-8 w-8 object-contain sm:h-12 sm:w-12"
        />
        <div>
          <h2 id="auth-modal-title" className="mt-1 text-base font-semibold text-on-surface sm:mt-0 sm:text-lg">
            {title}
          </h2>
          {view === "forgot" && !resetSentTo && (
            <p className="mt-0.5 text-xs text-on-surface-variant">
              We&apos;ll email you a link to set a new one.
            </p>
          )}
        </div>
      </div>

      {options.message && !error && view !== "forgot" && (
        <p className="mt-4 rounded-xl bg-primary/5 px-3 py-2 text-center text-xs text-on-surface">
          {options.message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-error/10 px-3 py-2 text-center text-xs text-error"
        >
          {error}
        </p>
      )}

      {!configured && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-error/10 px-3 py-2 text-center text-xs text-error"
        >
          Sign-in is unavailable: Firebase credentials are missing.
        </p>
      )}

      {signupChallenge ? (
        <form onSubmit={handleSignupVerification} className="mt-3 space-y-3 text-center sm:mt-5">
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Enter the six-digit code sent to <strong className="text-on-surface">{signupChallenge.email}</strong>, or
            tap <strong className="text-on-surface">Verify my email</strong> in that email — this window will finish
            signing you up by itself.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            aria-label="Six-digit verification code"
            autoFocus
            required
            className="h-12 w-full rounded-xl border border-outline/40 bg-surface px-4 text-center text-xl font-bold tracking-[0.45em] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button type="submit" disabled={busy !== null || verificationCode.length !== 6} className={primaryButton}>
            {busy === "email" ? "Verifying…" : "Verify and create account"}
          </button>
          <div className="flex items-center justify-center gap-4 text-xs">
            <button type="button" disabled={busy !== null} onClick={() => void resendSignupCode()} className={linkButton}>
              Send another code
            </button>
            <button type="button" disabled={busy !== null} onClick={() => setSignupChallenge(null)} className="text-on-surface-variant hover:text-primary">
              Change email
            </button>
          </div>
        </form>
      ) : view === "forgot" ? (
        resetSentTo ? (
          <div className="mt-5 text-center">
            <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
              mark_email_read
            </span>
            <p className="mt-2 text-sm text-on-surface">Check your email</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              We&apos;ve sent a reset link to {resetSentTo}. It expires in 1 hour. Check your spam
              folder if you don&apos;t see it. Asking again cancels this link, so use the newest email.
            </p>
            <button
              type="button"
              onClick={() => switchView("signin")}
              className={`${primaryButton} mx-auto mt-5 sm:w-56`}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                autoComplete="email"
                autoFocus
                required
                className={inputClass}
              />
              <button type="submit" disabled={busy !== null} className={`${primaryButton} sm:w-44`}>
                {busy === "email" ? "Sending…" : "Send reset link"}
              </button>
            </div>
            <p className="pt-1 text-center text-xs text-on-surface-variant sm:text-left">
              <button type="button" onClick={() => switchView("signin")} className={linkButton}>
                Back to sign in
              </button>
            </p>
          </form>
        )
      ) : (
        <>
          <form onSubmit={handleEmail} className="mt-3 space-y-2 sm:mt-5 sm:space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              {view === "signup" && (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  aria-label="Full name"
                  autoComplete="name"
                  required
                  className={inputClass}
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                autoComplete="email"
                autoFocus
                required
                className={inputClass}
              />
              <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => {
                    if (view === "signup" && password) setPasswordTouched(true);
                  }}
                  placeholder={view === "signup" ? "Create a password" : "Password"}
                  aria-label="Password"
                  aria-invalid={passwordHint ? true : undefined}
                  aria-describedby={passwordHint ? "password-hint" : undefined}
                  autoComplete={view === "signup" ? "new-password" : "current-password"}
                  maxLength={128}
                  required
                  className={`${inputClass} pr-11 ${passwordHint ? "!border-red-400 focus:!border-red-500 focus:!ring-red-500/20" : ""}`}
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
                <p id="password-hint" role="alert" className="mt-1 px-1 text-[11px] leading-snug text-red-600">
                  {passwordHint}
                </p>
              )}
              </div>
              {view === "signup" && <div className="sm:col-span-2">{termsBox}</div>}
              {view === "signup" && (
                <button
                  type="submit"
                  disabled={busy !== null || !configured || !agreed}
                  className={primaryButton}
                >
                  {busy === "email" ? "Please wait…" : "Create account"}
                </button>
              )}
            </div>
            {view === "signin" && (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <button
                  type="button"
                  onClick={() => switchView("forgot")}
                  className={`${linkButton} self-end text-xs sm:self-auto`}
                >
                  Forgot password?
                </button>
                <button
                  type="submit"
                  disabled={busy !== null || !configured}
                  className={`${primaryButton} sm:w-[calc(50%-0.375rem)]`}
                >
                  {busy === "email" ? "Please wait…" : "Sign in"}
                </button>
              </div>
            )}
          </form>

          {configured && (
            <div className="my-2.5 flex items-center gap-3 sm:my-4">
              <span className="h-px flex-1 bg-outline/30" />
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                or
              </span>
              <span className="h-px flex-1 bg-outline/30" />
            </div>
          )}

          <div className="grid items-center gap-2.5 sm:grid-cols-2 sm:gap-3">
            {configured && view === "signin" && <div className="sm:col-span-2">{termsBox}</div>}
            {configured && (
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy !== null}
                className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-outline/40 bg-surface sm:h-11 text-sm font-medium text-on-surface transition hover:bg-surface-container-high disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
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
                {busy === "google" ? "Opening Google…" : "Continue with Google"}
              </button>
            )}
            <div className="text-center text-xs text-on-surface-variant">
              <p>
                {view === "signin" ? "New to Kelmon?" : "Have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => switchView(view === "signin" ? "signup" : "signin")}
                  className={linkButton}
                >
                  {view === "signin" ? "Create account" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Shown to admins after sign-in: dashboard, or the store as a customer sees it. */
function AdminDestinationPrompt({
  superAdmin,
  onAdmin,
  onCustomer,
}: {
  superAdmin: boolean;
  onAdmin: () => void;
  onCustomer: () => void;
}) {
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
          admin_panel_settings
        </span>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {superAdmin ? "Super admin" : "Admin"}
        </p>
        <h2 id="auth-modal-title" className="mt-1 text-lg font-semibold text-on-surface">
          Where to?
        </h2>
      </div>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <button type="button" onClick={onAdmin} autoFocus className={`${primaryButton} gap-2`}>
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          Admin dashboard
        </button>
        <button
          type="button"
          onClick={onCustomer}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-outline/40 text-sm font-medium text-on-surface transition hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">storefront</span>
          Continue shopping
        </button>
      </div>
    </>
  );
}
