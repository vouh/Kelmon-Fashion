"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";

/**
 * Supabase auth session for the whole app.
 *
 * Replaces FirebaseProvider and the window.fb_* / document 'auth-changed'
 * event pattern from js/firebase-service.js and js/auth.js with React context.
 */
interface AuthContextValue {
  configured: boolean;
  /** True until the initial session lookup settles. */
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<ProfileRow, "full_name" | "phone" | "campus" | "avatar_url">>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Maps Supabase auth errors to friendly copy.
 * Ported from getAuthErrorMessage() in js/auth.js — same intent, different
 * error strings, since Supabase reports messages rather than auth/* codes.
 */
export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const msg = raw.toLowerCase();

  if (msg.includes("invalid login credentials")) return "Invalid email or password.";
  if (msg.includes("email not confirmed")) return "Check your inbox and confirm your email first.";
  if (msg.includes("user already registered") || msg.includes("already been registered"))
    return "An account with this email already exists. Try signing in.";
  if (msg.includes("password should be at least"))
    return "Password is too short. Use at least 6 characters.";
  if (msg.includes("unable to validate email") || msg.includes("invalid email"))
    return "That doesn't look like a valid email address.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("popup") || msg.includes("cancelled"))
    return "Sign-in was cancelled. Please try again.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Network error. Check your internet connection.";

  return raw || "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  // Only build a client when env is present, so the app still renders without it.
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);

  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const user = session?.user ?? null;

  const loadProfile = useCallback(
    async (userId: string | undefined) => {
      if (!supabase || !userId) {
        setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setProfile(data ?? null);
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session?.user.id);
    });

    // Equivalent of onAuthStateChanged in js/firebase-service.js
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      void loadProfile(nextSession?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const requireClient = useCallback(() => {
    if (!supabase) throw new Error("Supabase is not configured. Add credentials to .env.local");
    return supabase;
  }, [supabase]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const client = requireClient();
    const next = redirectTo ?? window.location.pathname;
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  }, [requireClient]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const client = requireClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, [requireClient]);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      const client = requireClient();
      // full_name lands in raw_user_meta_data, which the handle_new_user()
      // trigger copies into profiles.full_name.
      const { error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    },
    [requireClient]
  );

  const signOut = useCallback(async () => {
    const client = requireClient();
    await client.auth.signOut();
    setProfile(null);
  }, [requireClient]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<ProfileRow, "full_name" | "phone" | "campus" | "avatar_url">>) => {
      const client = requireClient();
      if (!user) throw new Error("You must be signed in.");
      const { error } = await client.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
      await loadProfile(user.id);
    },
    [requireClient, user, loadProfile]
  );

  const refreshProfile = useCallback(() => loadProfile(user?.id), [loadProfile, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      session,
      profile,
      isAdmin: profile?.role === "admin",
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [
      configured,
      loading,
      user,
      session,
      profile,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      updateProfile,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
