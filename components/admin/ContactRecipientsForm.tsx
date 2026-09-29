"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveContactRecipients, saveOrderAlertRecipients } from "@/app/admin/inbox-actions";

const MAX = 4;

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";

/** Up to four addresses that receive contact-form emails. */
export default function ContactRecipientsForm({
  initial,
  fallback,
  list = "contact",
}: {
  initial: string[];
  /** RESEND_CONTACT_TO_EMAIL, used until a list is saved here. */
  fallback: string[];
  /** Which saved list this form edits. */
  list?: "contact" | "alerts";
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [emails, setEmails] = useState<string[]>(initial.length ? initial : [""]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function update(index: number, value: string) {
    setEmails((list) => list.map((e, i) => (i === index ? value : e)));
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const result =
        list === "alerts" ? await saveOrderAlertRecipients(emails) : await saveContactRecipients(emails);
      if (!result.ok) setStatus({ ok: false, text: result.error });
      else {
        setStatus({ ok: true, text: result.message ?? "Saved." });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={save} className="space-y-2">
      {emails.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-4 text-[10px] font-black text-white/25">{index + 1}</span>
          <input
            type="email"
            value={value}
            onChange={(e) => update(index, e.target.value)}
            placeholder="name@example.com"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setEmails((list) => (list.length > 1 ? list.filter((_, i) => i !== index) : [""]))}
            className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
            aria-label="Remove address"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      ))}

      {initial.length === 0 && fallback.length > 0 && (
        <p className="text-[10px] text-white/35">
          {list === "alerts"
            ? `Nothing saved yet — alerts currently go to the super admins only (${fallback.join(", ")}).`
            : `Nothing saved yet — currently going to ${fallback.join(", ")} (from the server config).`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {emails.length < MAX && (
          <button
            type="button"
            onClick={() => setEmails((list) => [...list, ""])}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">add</span> Add address
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {status && (
          <span className={`text-[11px] ${status.ok ? "text-green-300" : "text-red-300"}`}>
            {status.text}
          </span>
        )}
      </div>
    </form>
  );
}
