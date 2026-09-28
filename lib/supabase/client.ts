"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser Supabase client, authenticated by Firebase.
 *
 * `accessToken` is the whole integration on this side: supabase-js calls it
 * before every request and sends the result as the bearer token. Supabase
 * validates that Firebase JWT against the project registered under
 * Authentication -> Third Party Auth, and RLS then sees the Firebase UID in
 * `app_uid()` and the `admin` custom claim in `is_admin()`.
 *
 * getIdToken() returns the cached token and only hits the network when it is
 * close to expiry, so calling it per request is cheap.
 *
 * Supplying `accessToken` also disables the client's own `auth` namespace —
 * signing in is Firebase's job now (see components/providers/AuthProvider.tsx),
 * and a second session store would be one more thing to drift.
 */
let client: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
  if (client) return client;

  client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        if (!isFirebaseConfigured()) return null;
        const user = getFirebaseAuth().currentUser;
        return user ? user.getIdToken() : null;
      },
    }
  );

  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
