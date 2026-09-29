"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, formatDateTime } from "@/components/admin/ui";
import { createDeal, deleteDeal } from "@/app/admin/actions";
import { uploadDealImage } from "@/lib/supabase/storage";
import type { DealRow } from "@/lib/supabase/types";
import { searchAnchor } from "@/lib/admin-search";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";

export default function DealsManager({ deals }: { deals: DealRow[] }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [uploading, setUploading] = useState(false);

  /** Uploads to the deal-images bucket and fills the field with the result. */
  async function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      setImage(await uploadDealImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDeal({
        title,
        description,
        image,
        code,
        discountPercent: discount ? Number(discount) : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      setImage("");
      setCode("");
      setDiscount("");
      setEndsAt("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteDeal(id);
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
        <h3 className="text-xs font-black text-white">Create a deal</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title, e.g. Freshers Week 20% off"
            className={inputClass}
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Promo code (optional)"
            className={inputClass}
          />
          <input
            type="number"
            min="1"
            max="100"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="Discount %"
            className={inputClass}
          />
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
          <div className="space-y-2 sm:col-span-2">
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="Image URL (optional)"
              className={inputClass}
            />
            <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 transition hover:text-white/70">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  void handleUpload(e.target.files);
                  e.target.value = "";
                }}
              />
              <span className="material-symbols-outlined text-base">upload</span>
              {uploading ? "Uploading…" : "Or upload an image (max 5MB)"}
            </label>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className={`${inputClass} sm:col-span-2`}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Publish deal"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {deals.length === 0 ? (
          <EmptyState icon="local_offer" message="No deals yet" />
        ) : (
          <ul className="divide-y divide-white/5">
            {deals.map((deal) => (
              <li key={deal.id} id={searchAnchor("deal", deal.id)} className="flex items-start gap-3 px-4 py-3">
                <span className="material-symbols-outlined mt-0.5 text-base text-amber-400">
                  local_offer
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-black text-white">{deal.title}</p>
                    {deal.discount_percent && (
                      <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                        {deal.discount_percent}% OFF
                      </span>
                    )}
                    {deal.code && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white/60">
                        {deal.code}
                      </span>
                    )}
                    {!deal.active && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/40">
                        inactive
                      </span>
                    )}
                  </div>
                  {deal.description && (
                    <p className="mt-1 text-[11px] text-white/45">{deal.description}</p>
                  )}
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/25">
                    {formatDateTime(deal.created_at)}
                    {deal.ends_at && ` · ends ${formatDateTime(deal.ends_at)}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(deal.id)}
                  className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  aria-label="Delete deal"
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
