"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { deleteHomepageDrop, moveHomepageDrop, upsertHomepageDrop } from "@/app/admin/actions";
import { EmptyState } from "@/components/admin/ui";
import { uploadDealImage } from "@/lib/supabase/storage";
import type { HomepageDropRow } from "@/lib/supabase/types";
import type { Product } from "@/lib/products";
import { searchAnchor } from "@/lib/admin-search";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none disabled:opacity-60";
const labelClass = "block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1";

type Draft = {
  id?: string;
  /** Linked product's slug, or "" for a custom card. */
  productId: string;
  name: string;
  price: string;
  category: string;
  image: string;
  active: boolean;
};

const emptyDraft = (): Draft => ({ productId: "", name: "", price: "", category: "", image: "", active: true });

function draftFrom(drop: HomepageDropRow): Draft {
  return {
    id: drop.id,
    productId: drop.product_id ?? "",
    name: drop.name,
    price: String(drop.price),
    category: drop.category,
    image: drop.image,
    active: drop.active,
  };
}

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE")}`;
const MAX_DROPS = 4;

export default function HomepageDropsManager({
  drops,
  products,
}: {
  drops: HomepageDropRow[];
  /** Every product (published or not), for the "link to a product" picker. */
  products: Product[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(products.map((p) => [p.id, p]));
  const linked = draft?.productId ? byId.get(draft.productId) : undefined;

  function linkProduct(productId: string) {
    if (!draft) return;
    const product = byId.get(productId);
    if (!product) {
      setDraft({ ...draft, productId: "" });
      return;
    }
    setDraft({
      ...draft,
      productId,
      name: product.name,
      price: String(product.price),
      category: product.category,
      image: product.images?.[0] ?? draft.image,
    });
  }

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
        productId: draft.productId || null,
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

  function move(id: string, direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await moveHomepageDrop(id, direction);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-xs leading-relaxed text-white/55">
          Fill the four homepage &ldquo;Just Dropped&rdquo; slots with catalogue products. Their live name, price,
          category and cover photo stay in sync automatically. Use the arrows below to control their order.
        </p>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${drops.length === MAX_DROPS ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
          {drops.length} / {MAX_DROPS} slots filled
        </span>
      </div>
      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">{error}</div>}

      {draft ? (
        <form onSubmit={save} className="space-y-4 rounded-xl border border-purple-400/25 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-black text-white">{draft.id ? "Edit homepage drop" : "Add homepage drop"}</h3>
            <button type="button" onClick={() => setDraft(null)} className="text-xs text-white/50 hover:text-white">Cancel</button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Link to a product</label>
                <select value={draft.productId} onChange={(e) => linkProduct(e.target.value)} className={inputClass}>
                  <option value="">— Select a catalogue product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.code, p.name].filter(Boolean).join(" · ")} — {kes(p.price)}
                      {p.active === false ? " (draft)" : (p.stock ?? 0) <= 0 ? " (sold out)" : ""}
                    </option>
                  ))}
                </select>
                {linked && (
                  <p className="mt-1.5 text-[10px] text-white/40">
                    Shows this product&apos;s live name, price and category, and opens its page.
                    {(linked.active === false || (linked.stock ?? 0) <= 0) && (
                      <span className="text-amber-300">
                        {" "}It&apos;s {linked.active === false ? "not published" : "sold out"} right now, so the card stays hidden
                        until it is.
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Name</label>
                  <input required disabled={Boolean(linked)} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Price (KES)</label>
                  <input required disabled={Boolean(linked)} type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <input required disabled={Boolean(linked)} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Category" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Image</label>
                <input required disabled={Boolean(linked)} value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="Image URL" className={inputClass} />
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  {!linked && <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70">
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
                    <span className="material-symbols-outlined text-base">upload</span>
                    {uploading ? "Uploading…" : "Upload a different image"}
                  </label>}
                  {linked && <span className="text-[10px] text-white/40">The product&apos;s cover photo is used automatically.</span>}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-white/75">
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="accent-purple-500" />
                Show on homepage
              </label>
            </div>

            {/* Live preview, styled like the homepage card */}
            <div>
              <p className={labelClass}>Preview</p>
              <div className="flex flex-col items-center rounded-2xl bg-white px-3 py-5 text-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full bg-zinc-100 ring-[5px] ring-white shadow-[0_12px_32px_rgba(142,68,173,0.14)]">
                  {draft.image ? (
                    <Image src={draft.image} alt="" fill unoptimized className="object-cover" sizes="128px" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-zinc-400">No image</span>
                  )}
                </div>
                <p className="mt-3 max-w-full truncate text-sm font-semibold text-zinc-900">{draft.name || "Name"}</p>
                <p className="mt-0.5 text-sm font-semibold text-[#8e44ad]">{draft.price ? kes(Number(draft.price)) : "KES —"}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{draft.category || "Category"}</p>
                <p className="mt-2 text-[10px] text-zinc-400">
                  Opens {linked ? `the ${linked.code ?? linked.name} product page` : "the shop"}
                </p>
              </div>
            </div>
          </div>

          <button type="submit" disabled={busy || uploading} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500 disabled:opacity-50">
            {busy ? "Saving…" : "Save drop"}
          </button>
        </form>
      ) : (
        <button type="button" disabled={drops.length >= MAX_DROPS} onClick={() => setDraft(emptyDraft())} className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40">
          {drops.length >= MAX_DROPS ? "All four slots are filled" : "Add product to homepage"}
        </button>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {drops.length === 0 ? (
          <EmptyState icon="view_carousel" message="No homepage drops yet" />
        ) : (
          <ul className="divide-y divide-white/5">
            {drops.map((drop, index) => {
              const product = drop.product_id ? byId.get(drop.product_id) : undefined;
              const image = product?.images?.[0] ?? drop.image;
              return (
                <li key={drop.id} id={searchAnchor("drop", drop.id)} className="flex items-center gap-3 p-3">
                  <span className="w-5 text-center text-[10px] font-black text-white/30">{index + 1}</span>
                  <Image src={image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-xs font-black text-white">
                      {product?.name ?? drop.name}
                      {product ? (
                        <span className="flex items-center gap-0.5 rounded bg-purple-400/15 px-1.5 py-0.5 text-[9px] font-black text-purple-200" title="Linked to a product">
                          <span className="material-symbols-outlined text-[11px]">link</span>
                          {product.code ?? "linked"}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-white/45">
                      {kes(product?.price ?? drop.price)} · {product?.category ?? drop.category}
                      {!drop.active && " · hidden"}
                      {product && (product.active === false ? " · product not published" : (product.stock ?? 0) <= 0 ? " · product sold out" : "")}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <button type="button" disabled={busy || index === 0} onClick={() => move(drop.id, "up")} className="rounded p-0.5 text-white/45 hover:bg-white/5 hover:text-white disabled:opacity-20" aria-label={`Move ${drop.name} earlier`}>
                      <span className="material-symbols-outlined text-base">keyboard_arrow_up</span>
                    </button>
                    <button type="button" disabled={busy || index === drops.length - 1} onClick={() => move(drop.id, "down")} className="rounded p-0.5 text-white/45 hover:bg-white/5 hover:text-white disabled:opacity-20" aria-label={`Move ${drop.name} later`}>
                      <span className="material-symbols-outlined text-base">keyboard_arrow_down</span>
                    </button>
                  </div>
                  <button type="button" onClick={() => setDraft(draftFrom(drop))} className="rounded p-1 text-purple-300 hover:bg-purple-500/10" aria-label={`Edit ${drop.name}`}>
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(drop.id)} className="rounded p-1 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label={`Delete ${drop.name}`}>
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
