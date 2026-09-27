"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, formatDateTime } from "@/components/admin/ui";
import { createUpdate, deleteUpdate } from "@/app/admin/actions";
import type { UpdateRow } from "@/lib/supabase/types";

const TAGS = ["news", "feature", "restock", "event", "notice"];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";

export default function UpdatesManager({ updates }: { updates: UpdateRow[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState(TAGS[0]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUpdate({ title, body, tag });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setBody("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteUpdate(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/5 bg-zinc-900 p-4">
        <h3 className="text-xs font-black text-white">Post an update</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={inputClass}
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className={`${inputClass} sm:w-32`}
          >
            {TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's new?"
          rows={3}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {busy ? "Posting…" : "Publish update"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {updates.length === 0 ? (
          <EmptyState icon="campaign" message="No updates yet" />
        ) : (
          <ul className="divide-y divide-white/5">
            {updates.map((update) => (
              <li key={update.id} className="flex items-start gap-3 px-4 py-3">
                <span className="material-symbols-outlined mt-0.5 text-base text-blue-400">
                  campaign
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-black text-white">{update.title}</p>
                    {update.tag && (
                      <span className="rounded bg-blue-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-300">
                        {update.tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] text-white/45">
                    {update.body}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/25">
                    {formatDateTime(update.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(update.id)}
                  className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  aria-label="Delete update"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
