"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModal";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * The heart on a product: whether the signed-in customer likes it, and a
 * toggle that saves to `product_likes` (RLS limits each customer to their own
 * rows). Signed-out taps open the sign-in modal instead.
 */
export function useProductLike(productId: string) {
  const { user, loading } = useAuth();
  const { openAuth } = useAuthModal();
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || !isSupabaseConfigured()) {
      setLiked(false);
      return;
    }
    let cancelled = false;
    void createClient()
      .from("product_likes")
      .select("product_id")
      .eq("product_id", productId)
      .eq("user_id", user.uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLiked(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [productId, user, loading]);

  const toggle = useCallback(async () => {
    if (!user) {
      openAuth({ message: "Sign in to like products and get picks made for you." });
      return;
    }
    if (busy) return;

    const next = !liked;
    setLiked(next);
    setBusy(true);
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("product_likes").upsert(
          { user_id: user.uid, product_id: productId },
          { onConflict: "user_id,product_id", ignoreDuplicates: true }
        )
      : await supabase
          .from("product_likes")
          .delete()
          .eq("user_id", user.uid)
          .eq("product_id", productId);
    if (error) {
      console.error("[likes]", error.message);
      setLiked(!next);
    }
    setBusy(false);
  }, [user, busy, liked, productId, openAuth]);

  return { liked, toggle, busy };
}
