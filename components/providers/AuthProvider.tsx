"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { TERMS_VERSION } from "@/lib/legal";

/**
 * Firebase Authentication for the whole app, with the server kept in step.
 *
 * Firebase owns the session; Supabase owns the data. The join between them is
 * the ID token, which this provider does two things with on every change:
 *
 *   1. POSTs it to /api/auth/session, so the server has an httpOnly copy to
 *      read (server components, the /admin gate) and the custom claims RLS
 *      needs get written.
 *   2. Leaves it where the Supabase client can find it — lib/supabase/client.ts
 *      calls getIdToken() itself before each request.
 *
 * onIdTokenChanged rather than onAuthStateChanged: it fires for sign-in and
 * sign-out *and* for the automatic refresh Firebase performs shortly before the
 * hour is up. That last one is what keeps the server's cookie from going stale
 * while a tab sits open.
 */
interface AuthContextValue {
  /** True when Firebase credentials are present. */
  configured: boolean;
  /** True until the initial token lookup settles. */
  loading: boolean;
  user: User | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
  /** One of the protected super admins in lib/auth/protected-accounts.ts. */
  isSuperAdmin: boolean;
  signInWithGoogle: () => Promise<SignInResult>;
  signInWithEmail: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<ProfileRow, "full_name" | "phone" | "campus" | "county" | "location" | "avatar_url">>
  ) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /**
   * Records that the signed-in user accepted the current Terms of Service and
   * Privacy Policy. Only fills an empty record, so re-signing in never moves
   * the original acceptance date. Best effort: never throws.
   */
  acceptTerms: () => Promise<void>;
  /**
   * Makes sure the server's cookies hold a live token before a request that
   * needs one (placing an order). Resolves false when nobody is signed in.
   */
  ensureSession: () => Promise<boolean>;
}

/** The role the server settled on for the account that just signed in. */
export interface SignInResult {
  admin: boolean;
  superAdmin: boolean;
}

const NO_ROLE: SignInResult = { admin: false, superAdmin: false };

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Maps Firebase auth errors to friendly copy.
 *
 * Firebase reports `auth/*` codes, so this matches on those rather than on the
 * message text Supabase used to return.
 */
export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const code = (error as { code?: string } | null)?.code ?? raw;

  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password"))
    return "Invalid email or password.";
  if (code.includes("auth/user-not-found"))
    return "No account with that email. Create an account below.";
  if (code.includes("auth/email-already-in-use"))
    return "An account with this email already exists. Try signing in.";
  if (code.includes("auth/weak-password"))
    return "Password is too short. Use at least 6 characters.";
  if (code.includes("auth/invalid-email"))
    return "That doesn't look like a valid email address.";
  if (code.includes("auth/too-many-requests"))
    return "Too many attempts. Please wait a moment and try again.";
  if (code.includes("auth/popup-closed-by-user") || code.includes("auth/cancelled-popup-request"))
    return "Sign-in was cancelled. Please try again.";
  if (code.includes("auth/popup-blocked"))
    return "Your browser blocked the sign-in popup. Allow popups and try again.";
  if (code.includes("auth/network-request-failed"))
    return "Network error. Check your internet connection.";
  if (code.includes("auth/operation-not-allowed"))
    return "That sign-in method is not enabled for this project yet.";
  if (code.includes("auth/unauthorized-domain"))
    return "This domain is not authorised in the Firebase console.";
  if (code.includes("auth/expired-action-code"))
    return "This reset link has expired. Request a new one.";
  if (code.includes("auth/invalid-action-code"))
    return "This reset link is invalid or has already been used. Request a new one.";

  return raw || "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const router = useRouter();

  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<SignInResult>(NO_ROLE);

  /** Why the last session sync failed, or null when it succeeded. */
  const syncError = useRef<string | null>(null);

  /** The uid the server was last told about, so a refresh only fires on change. */
  const syncedUid = useRef<string | null>(null);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid || !isSupabaseConfigured()) {
      setProfile(null);
      return;
    }
    const { data } = await createClient()
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  /**
   * Mirrors the current token into the server's cookie, and returns the role
   * the server decided on — the custom claims are written there, so it is the
   * one place that knows them before the client's token catches up.
   */
  const syncSession = useCallback(async (next: User | null): Promise<SignInResult> => {
    if (!next) {
      await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
      setRole(NO_ROLE);
      return NO_ROLE;
    }

    const post = (idToken: string) =>
      fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

    let response = await post(await next.getIdToken());
    // A 404 or 5xx with no JSON body is the platform, not this route: a dev
    // server mid-recompile, or a cold serverless start. One short retry clears
    // it instead of showing the customer a raw status code.
    if (response.status === 404 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      response = await post(await next.getIdToken());
    }
    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      syncError.current =
        error ??
        (response.status === 404 || response.status >= 500
          ? "We couldn't reach the server to sign you in. Please check your connection and try again."
          : `Could not start your session (HTTP ${response.status}).`);
      setRole(NO_ROLE);
      return NO_ROLE;
    }
    syncError.current = null;

    const body = (await response.json()) as {
      admin?: boolean;
      superAdmin?: boolean;
      refreshRequired?: boolean;
    };
    if (body.refreshRequired) {
      // The server wrote a custom claim, which the token just sent predates.
      // Force a new one so Postgres actually sees it, and store that instead.
      // This settles in one extra round: the second sync finds nothing to write.
      await post(await next.getIdToken(true));
    }

    const result = { admin: body.admin === true, superAdmin: body.superAdmin === true };
    setRole(result);
    return result;
  }, []);

  useEffect(() => {
    if (!configured) return;

    let active = true;

    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (next) => {
      if (!active) return;

      setUser(next);
      setLoading(false);

      await syncSession(next);
      if (!active) return;

      await loadProfile(next?.uid);
      if (!active) return;

      // Server components rendered before the cookie existed still think the
      // visitor is anonymous. Re-render them, but only when the identity itself
      // changed — a routine hourly token refresh must not remount the page.
      const uid = next?.uid ?? null;
      if (syncedUid.current !== uid) {
        syncedUid.current = uid;
        router.refresh();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [configured, syncSession, loadProfile, router]);

  // A tab left in the background (or a laptop asleep) can outlive the hour-long
  // cookie without Firebase's refresh timer firing. Re-sync when the tab comes
  // back; getIdToken() hands back the cached token unless it is near expiry.
  useEffect(() => {
    if (!configured) return;
    const onVisible = () => {
      const current = getFirebaseAuth().currentUser;
      if (document.visibilityState === "visible" && current) void syncSession(current);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [configured, syncSession]);

  const ensureSession = useCallback(async () => {
    if (!configured) return false;
    const auth = getFirebaseAuth();
    // Firebase restores the user from IndexedDB asynchronously on page load.
    await auth.authStateReady();
    if (!auth.currentUser) return false;
    await syncSession(auth.currentUser);
    // Signed in to Firebase but the server refused the token: sending the user
    // back to sign-in would just loop, so surface why instead.
    if (syncError.current) throw new Error(syncError.current);
    return true;
  }, [configured, syncSession]);

  const requireAuth = useCallback(() => {
    if (!configured) {
      throw new Error("Firebase is not configured. Add credentials to .env.local");
    }
    return getFirebaseAuth();
  }, [configured]);

  const signInWithGoogle = useCallback(async () => {
    const auth = requireAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    // A popup rather than a redirect: it keeps the caller on the page, so there
    // is no OAuth landing route to maintain and no code to exchange.
    const credential = await signInWithPopup(auth, provider);
    // Synced here as well as in onIdTokenChanged so the caller learns the role
    // (and the cookie carries the admin claim) before it decides where to go.
    return syncSession(credential.user);
  }, [requireAuth, syncSession]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const credential = await signInWithEmailAndPassword(requireAuth(), email, password);
      return syncSession(credential.user);
    },
    [requireAuth, syncSession]
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(requireAuth());
    setProfile(null);
    setRole(NO_ROLE);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    router.refresh();
  }, [requireAuth, router]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<ProfileRow, "full_name" | "phone" | "campus" | "county" | "location" | "avatar_url">>) => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await createClient().from("profiles").update(patch).eq("id", user.uid);
      if (error) throw new Error(error.message);
      await loadProfile(user.uid);
    },
    [user, loadProfile]
  );

  const refreshProfile = useCallback(() => loadProfile(user?.uid), [loadProfile, user?.uid]);

  const acceptTerms = useCallback(async () => {
    // Read from Firebase directly: right after sign-up, `user` state may not
    // have caught up yet.
    const uid = configured ? getFirebaseAuth().currentUser?.uid : undefined;
    if (!uid || !isSupabaseConfigured()) return;
    try {
      const { error } = await createClient()
        .from("profiles")
        .update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION })
        .eq("id", uid)
        .is("terms_accepted_at", null);
      if (error) console.warn("[auth] acceptTerms:", error.message);
    } catch (err) {
      console.warn("[auth] acceptTerms:", err);
    }
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      profile,
      isAdmin: role.admin || profile?.role === "admin",
      isSuperAdmin: role.superAdmin,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      updateProfile,
      refreshProfile,
      acceptTerms,
      ensureSession,
    }),
    [
      configured,
      loading,
      user,
      profile,
      role,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      updateProfile,
      refreshProfile,
      acceptTerms,
      ensureSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
