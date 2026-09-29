"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { deleteHomepageDrop, upsertHomepageDrop } from "@/app/admin/actions";
import { EmptyState } from "@/components/admin/ui";
import { uploadDealImage } from "@/lib/supabase/storage";
import type { HomepageDropRow } from "@/lib/supabase/types";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";

type Draft = {
  id?: string;
  name: string;
  price: string;
  category: string;
  image: string;
  active: boolean;
};

const emptyDraft = (): Draft => ({ name: "", price: "", category: "", image: "", active: true });

function draftFrom(drop: HomepageDropRow): Draft {
  return {
    id: drop.id,
    name: drop.name,
    price: String(drop.price),
    category: drop.category,
    image: drop.image,
    active: drop.active,
  };
}

export default function HomepageDropsManager({ drops }: { drops: HomepageDropRow[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file || !draft) return;
    setError(null);
    setUploading(true);
    try {
      const image = await uploadDealImage(file);
      setDraft((current) => (current ? { ...current, image } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await upsertHomepageDrop({
        id: draft.id,
        name: draft.name,
        price: Number(draft.price),
        category: draft.category,
        image: draft.image,
        active: draft.active,
      });
      if (!result.ok) return setError(result.error);
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteHomepageDrop(id);
      if (!result.ok) return setError(result.error);
      if (draft?.id === id) setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-white/55">
        Choose exactly what appears in the homepage carousel. These cards do not alter your shop products.
      </p>
      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">{error}</div>}

      {draft ? (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-purple-400/25 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-black text-white">{draft.id ? "Edit homepage drop" : "Add homepage drop"}</h3>
            <button type="button" onClick={() => setDraft(null)} className="text-xs text-white/50 hover:text-white">Cancel</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className={inputClass} />
            <input required type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price (KES)" className={inputClass} />
            <input required value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Category" className={inputClass} />
            <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/75">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="accent-purple-500" />
              Show on homepage
            </label>
            <div className="space-y-2 sm:col-span-2">
              <input required value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Image URL" className={inputClass} />
              <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70">
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
                <span className="material-symbols-outlined text-base">upload</span>
                {uploading ? "Uploading…" : "Upload image (max 5MB)"}
              </label>
            </div>
          </div>
          {draft.image && <Image src={draft.image} alt="Drop preview" width={96} height={96} unoptimized className="h-24 w-24 rounded-full object-cover" />}
          <button type="submit" disabled={busy || uploading} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500 disabled:opacity-50">
            {busy ? "Saving…" : "Save drop"}
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setDraft(emptyDraft())} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500">
          Add homepage drop
        </button>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {drops.length === 0 ? (
          <EmptyState icon="view_carousel" message="No homepage drops yet" />
        ) : (
          <ul className="divide-y divide-white/5">
            {drops.map((drop) => (
              <li key={drop.id} className="flex items-center gap-3 p-3">
                <Image src={drop.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-white">{drop.name}</p>
                  <p className="text-[10px] text-white/45">KES {Number(drop.price).toLocaleString("en-KE")} · {drop.category}{!drop.active && " · hidden"}</p>
                </div>
                <button type="button" onClick={() => setDraft(draftFrom(drop))} className="rounded p-1 text-purple-300 hover:bg-purple-500/10" aria-label={`Edit ${drop.name}`}>
                  <span className="material-symbols-outlined text-base">edit</span>
                </button>
                <button type="button" disabled={busy} onClick={() => remove(drop.id)} className="rounded p-1 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label={`Delete ${drop.name}`}>
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
