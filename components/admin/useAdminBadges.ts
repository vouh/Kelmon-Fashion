"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AdminBadges {
  notifications: number;
  messages: number;
}

const REFRESH_MS = 20_000;

/** Fire after changing read state, so the bell and sidebar update at once. */
export const ADMIN_BADGES_REFRESH = "kelmon:admin-badges-refresh";

export function refreshAdminBadges() {
  window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
}

/**
 * Unread counts for the header bell and the sidebar. Head-only count queries,
 * so each refresh transfers no rows. Refetched on navigation, every 20s, when
 * the tab regains focus, and on ADMIN_BADGES_REFRESH.
 */
export function useAdminBadges(pathname: string): AdminBadges {
  const [badges, setBadges] = useState<AdminBadges>({ notifications: 0, messages: 0 });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();

    async function load() {
      const [notifications, messages] = await Promise.all([
        supabase
          .from("admin_notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false),
        supabase
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("read", false),
      ]);
      if (!active) return;
      setBadges({
        notifications: notifications.count ?? 0,
        messages: messages.count ?? 0,
      });
    }

    const refresh = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener(ADMIN_BADGES_REFRESH, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener(ADMIN_BADGES_REFRESH, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return badges;
}
