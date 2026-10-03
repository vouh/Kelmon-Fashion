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
import { bulkDeleteNotifications } from "@/app/admin/bulk-actions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const confirm = useConfirm();

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

  const shownSelected = shown.filter((n) => selected.has(n.id)).map((n) => n.id);
  const allShownSelected = shown.length > 0 && shownSelected.length === shown.length;
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function deleteSelected() {
    const ok = await confirm({
      title: `Delete ${shownSelected.length} notification${shownSelected.length === 1 ? "" : "s"}?`,
      message: "They'll be removed from the list. Orders and payments aren't affected.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const ids = shownSelected;
    run(async () => {
      const result = await bulkDeleteNotifications(ids);
      if (result.ok) setSelected(new Set());
      return result;
    });
  }

  const item = (n: AdminNotificationRow) => {
    const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
    return (
      <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.read ? "" : "bg-purple-500/[0.06]"}`}>
        <input
          type="checkbox"
          checked={selected.has(n.id)}
          onChange={() => toggle(n.id)}
          aria-label={`Select “${n.title}”`}
          className="mt-1 h-3.5 w-3.5 shrink-0 accent-purple-500"
        />
        <span className={`material-symbols-outlined mt-0.5 text-base ${style.color}`}>{style.icon}</span>
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
          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/25">{timeAgo(n.created_at)}</p>
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
          title="Delete"
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </li>
    );
  };

  /** Read ones sink to their own section below the unread. */
  const shownUnread = shown.filter((n) => !n.read);
  const shownRead = shown.filter((n) => n.read);

  async function deleteAllRead() {
    const count = notifications.length - unread;
    const ok = await confirm({
      title: `Delete all ${count} read notification${count === 1 ? "" : "s"}?`,
      message: "They'll be removed for good. Unread ones, orders and payments aren't affected.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) run(clearReadNotifications);
  }

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
      </div>

      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-zinc-900 px-4 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-white/60">
            <input
              type="checkbox"
              checked={allShownSelected}
              onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((n) => n.id)))}
              className="h-3.5 w-3.5 accent-purple-500"
            />
            {shownSelected.length ? `${shownSelected.length} selected` : "Select all"}
          </label>
          {shownSelected.length > 0 && (
            <>
              <span className="flex-1" />
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const ids = shownSelected;
                  run(async () => {
                    const result = await markNotificationsRead(ids);
                    if (result.ok) setSelected(new Set());
                    return result;
                  });
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-40"
              >
                Mark read
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteSelected()}
                className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-500 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm">delete</span> Delete
              </button>
            </>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
          <EmptyState icon="notifications" message={filter === "unread" ? "No unread notifications" : "No notifications"} />
        </div>
      ) : (
        <>
          {shownUnread.length > 0 && (
            <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
              {shownUnread.map(item)}
            </ul>
          )}

          {shownRead.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-1 pt-2">
                <span className="material-symbols-outlined text-base text-white/30">done_all</span>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Read · {shownRead.length}
                </h2>
                <span className="flex-1" />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteAllRead()}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  Delete all read
                </button>
              </div>
              <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-zinc-900 opacity-75">
                {shownRead.map(item)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
