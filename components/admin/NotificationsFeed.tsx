"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, timeAgo } from "@/components/admin/ui";
import {
  clearReadNotifications,
  deleteNotification,
  markNotificationsRead,
} from "@/app/admin/inbox-actions";
import { refreshAdminBadges } from "@/components/admin/useAdminBadges";
import type { AdminNotificationRow, NotificationType } from "@/lib/supabase/types";

const TYPE_STYLE: Record<NotificationType, { icon: string; color: string; label: string }> = {
  order: { icon: "receipt_long", color: "text-purple-300", label: "Orders" },
  payment: { icon: "payments", color: "text-green-400", label: "Payments" },
  payment_failed: { icon: "credit_card_off", color: "text-red-400", label: "Failed payments" },
  stock: { icon: "inventory", color: "text-amber-400", label: "Stock" },
  message: { icon: "mail", color: "text-blue-400", label: "Messages" },
  system: { icon: "info", color: "text-white/60", label: "System" },
};

type Filter = "unread" | "all" | NotificationType;

export default function NotificationsFeed({
  notifications,
}: {
  notifications: AdminNotificationRow[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else {
        refreshAdminBadges();
        router.refresh();
      }
    });
  }

  const unread = notifications.filter((n) => !n.read).length;
  const presentTypes = [...new Set(notifications.map((n) => n.type))];
  const shown = notifications.filter((n) =>
    filter === "all" ? true : filter === "unread" ? !n.read : n.type === filter
  );

  const chip = (value: Filter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
        filter === value ? "bg-purple-600 text-white" : "bg-white/5 text-white/50 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {chip("all", "All")}
        {chip("unread", `Unread${unread ? ` (${unread})` : ""}`)}
        {presentTypes.map((t) => chip(t, TYPE_STYLE[t]?.label ?? t))}
        <span className="flex-1" />
        <button
          type="button"
          disabled={busy || unread === 0}
          onClick={() => run(() => markNotificationsRead("all"))}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-40"
        >
          Mark all read
        </button>
        <button
          type="button"
          disabled={busy || notifications.length === unread}
          onClick={() => run(clearReadNotifications)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-40"
        >
          Clear read
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {shown.length === 0 ? (
          <EmptyState icon="notifications" message="No notifications" />
        ) : (
          <ul className="divide-y divide-white/5">
            {shown.map((n) => {
              const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 ${n.read ? "" : "bg-purple-500/[0.06]"}`}
                >
                  <span className={`material-symbols-outlined mt-0.5 text-base ${style.color}`}>
                    {style.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />}
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.read) void markNotificationsRead([n.id]).then(refreshAdminBadges);
                          }}
                          className="text-xs font-black text-white hover:text-purple-300"
                        >
                          {n.title}
                        </Link>
                      ) : (
                        <p className="text-xs font-black text-white">{n.title}</p>
                      )}
                    </div>
                    {n.body && <p className="mt-0.5 text-[11px] text-white/50">{n.body}</p>}
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/25">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => markNotificationsRead([n.id]))}
                      className="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-50"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <span className="material-symbols-outlined text-base">done</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => deleteNotification(n.id))}
                    className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    aria-label="Delete notification"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
