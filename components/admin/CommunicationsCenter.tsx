"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, formatDateTime } from "@/components/admin/ui";
import {
  deleteContactMessage,
  sendEmailCampaign,
  setContactMessageRead,
} from "@/app/admin/inbox-actions";
import { refreshAdminBadges } from "@/components/admin/useAdminBadges";
import type { ContactMessageRow, EmailAudience, EmailCampaignRow } from "@/lib/supabase/types";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";
const labelClass = "block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1";

type Tab = "inbox" | "compose" | "sent";

const AUDIENCE_LABEL: Record<EmailAudience, string> = {
  all_customers: "All customers",
  customers_with_orders: "Customers who ordered",
  custom: "Specific people",
};

export default function CommunicationsCenter({
  messages,
  campaigns,
  audienceCounts,
  canSend,
}: {
  messages: ContactMessageRow[];
  campaigns: EmailCampaignRow[];
  audienceCounts: { all: number; withOrders: number };
  canSend: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("inbox");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Composer
  const [audience, setAudience] = useState<EmailAudience>("all_customers");
  const [custom, setCustom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function run(
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    onDone?: () => void
  ) {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setStatus({ ok: false, text: result.error ?? "Something went wrong." });
      else {
        if (result.message) setStatus({ ok: true, text: result.message });
        refreshAdminBadges();
        onDone?.();
        router.refresh();
      }
    });
  }

  function reply(message: ContactMessageRow) {
    setAudience("custom");
    setCustom(message.email);
    setSubject("Re: your message to Kelmon");
    setBody(
      `Hi ${message.first_name},\n\n\n\n— Kelmon\n\n> ${message.message.replace(/\n/g, "\n> ")}`
    );
    setTab("compose");
    if (!message.read) run(() => setContactMessageRead(message.id, true));
  }

  function toggle(message: ContactMessageRow) {
    const opening = openId !== message.id;
    setOpenId(opening ? message.id : null);
    if (opening && !message.read) run(() => setContactMessageRead(message.id, true));
  }

  const customList = custom
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const recipientCount =
    audience === "all_customers"
      ? audienceCounts.all
      : audience === "customers_with_orders"
        ? audienceCounts.withOrders
        : customList.length;

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!window.confirm(`Send "${subject}" to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}?`)) {
      return;
    }
    run(
      () =>
        sendEmailCampaign({
          audience,
          customRecipients: audience === "custom" ? customList : [],
          subject,
          body,
        }),
      () => {
        setSubject("");
        setBody("");
        setCustom("");
      }
    );
  }

  const unread = messages.filter((m) => !m.read).length;

  const tabButton = (value: Tab, icon: string, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(value);
        setStatus(null);
      }}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
        tab === value ? "bg-purple-600 text-white" : "bg-white/5 text-white/50 hover:text-white"
      }`}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabButton("inbox", "inbox", `Inbox${unread ? ` (${unread})` : ""}`)}
        {tabButton("compose", "edit", "Send email")}
        {tabButton("sent", "send", "Sent")}
      </div>

      {status && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs ${
            status.ok
              ? "border-green-400/30 bg-green-400/10 text-green-300"
              : "border-red-400/30 bg-red-400/10 text-red-300"
          }`}
        >
          {status.text}
        </div>
      )}

      {tab === "inbox" && (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
          {messages.length === 0 ? (
            <EmptyState icon="inbox" message="No messages from the contact page yet" />
          ) : (
            <ul className="divide-y divide-white/5">
              {messages.map((m) => {
                const open = openId === m.id;
                return (
                  <li key={m.id} className={m.read ? "" : "bg-purple-500/[0.06]"}>
                    <button
                      type="button"
                      onClick={() => toggle(m)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left"
                    >
                      <span className="material-symbols-outlined mt-0.5 text-base text-blue-400">
                        {m.read ? "drafts" : "mail"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2">
                          <span className={`text-xs ${m.read ? "font-bold text-white/70" : "font-black text-white"}`}>
                            {m.first_name} {m.last_name}
                          </span>
                          <span className="text-[10px] text-white/35">{m.email}</span>
                        </span>
                        <span
                          className={`mt-0.5 block text-[11px] text-white/50 ${open ? "whitespace-pre-wrap" : "truncate"}`}
                        >
                          {m.message}
                        </span>
                      </span>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-white/25">
                        {formatDateTime(m.created_at)}
                      </span>
                    </button>
                    {open && (
                      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pl-11">
                        {m.phone && (
                          <a
                            href={`tel:${m.phone}`}
                            className="text-[11px] text-white/50 hover:text-white"
                          >
                            {m.phone}
                          </a>
                        )}
                        <span className="flex-1" />
                        <button
                          type="button"
                          onClick={() => reply(m)}
                          className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-purple-500"
                        >
                          <span className="material-symbols-outlined text-sm">reply</span> Reply
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => setContactMessageRead(m.id, !m.read))}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-50"
                        >
                          Mark {m.read ? "unread" : "read"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => deleteContactMessage(m.id))}
                          className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          aria-label="Delete message"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "compose" && (
        <form onSubmit={send} className="space-y-3 rounded-xl border border-white/5 bg-zinc-900 p-4">
          {!canSend && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
              Email sending isn&apos;t configured on the server (RESEND_API_KEY / RESEND_FROM_EMAIL).
            </p>
          )}
          <div>
            <label className={labelClass}>Send to</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(AUDIENCE_LABEL) as EmailAudience[]).map((value) => {
                const count =
                  value === "all_customers"
                    ? audienceCounts.all
                    : value === "customers_with_orders"
                      ? audienceCounts.withOrders
                      : null;
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                      audience === value
                        ? "border-purple-400/50 bg-purple-500/10 text-white"
                        : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      checked={audience === value}
                      onChange={() => setAudience(value)}
                      className="accent-purple-500"
                    />
                    {AUDIENCE_LABEL[value]}
                    {count !== null && <span className="text-white/35">({count})</span>}
                  </label>
                );
              })}
            </div>
          </div>

          {audience === "custom" && (
            <div>
              <label className={labelClass}>Email addresses (comma separated, up to 50)</label>
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                rows={2}
                placeholder="jane@example.com, john@example.com"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="New arrivals this week"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Message</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              placeholder="Write your message. Leave a blank line between paragraphs."
              className={inputClass}
            />
            <p className="mt-1 text-[9px] text-white/25">
              Sent in the Kelmon branded email layout. Each person gets their own copy, so
              nobody sees the other recipients.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || !canSend || recipientCount === 0}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            {busy ? "Sending…" : `Send to ${recipientCount}`}
          </button>
        </form>
      )}

      {tab === "sent" && (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
          {campaigns.length === 0 ? (
            <EmptyState icon="send" message="No emails sent yet" />
          ) : (
            <ul className="divide-y divide-white/5">
              {campaigns.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black text-white">{c.subject}</p>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/50">
                      {AUDIENCE_LABEL[c.audience] ?? c.audience}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] text-white/45">
                    {c.body}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/25">
                    {formatDateTime(c.created_at)} · {c.recipient_count - c.failed_count} sent
                    {c.failed_count > 0 && (
                      <span className="text-red-300"> · {c.failed_count} failed</span>
                    )}
                    {c.sent_by && ` · by ${c.sent_by}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
