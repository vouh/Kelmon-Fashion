"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EmptyState, formatKes } from "@/components/admin/ui";
import { deleteProduct, setProductActive, upsertProduct } from "@/app/admin/actions";
import { uploadAll, uploadProductImage } from "@/lib/supabase/storage";
import type { Product } from "@/lib/products";

const BADGES = ["", "New", "Hot", "Sale"];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";
const labelClass =
  "block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1";

/** Turns "LV Speedy Bag" into "lv-speedy-bag" for the primary key. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Draft {
  id: string;
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  category: string;
  images: string[];
  sizes: string;
  colors: string;
  stock: string;
  badge: string;
  active: boolean;
  /** True when editing an existing row, so the slug is locked. */
  existing: boolean;
}

function emptyDraft(category: string): Draft {
  return {
    id: "",
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category,
    images: [],
    sizes: "",
    colors: "",
    stock: "0",
    badge: "",
    active: true,
    existing: false,
  };
}

function draftFrom(product: Product): Draft {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    originalPrice: product.originalPrice ? String(product.originalPrice) : "",
    category: product.category,
    images: product.images ?? [product.image],
    sizes: (product.sizes ?? []).join(", "),
    colors: (product.colors ?? []).join(", "),
    stock: String(product.stock ?? 0),
    badge: product.badge ?? "",
    active: true,
    existing: true,
  };
}

export default function ProductsManager({
  products,
  categories,
}: {
  products: Product[];
  categories: string[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else {
        onDone?.();
        router.refresh();
      }
    });
  }

  /**
   * Uploads straight to the product-images bucket. Writes there are admin-only
   * by RLS, checked against the Firebase token the Supabase client sends.
   */
  async function handleUpload(files: FileList | null) {
    if (!files?.length || !draft) return;
    setError(null);
    setUploading(true);

    try {
      const slug = draft.id || slugify(draft.name) || "product";
      const urls = await uploadAll(Array.from(files), (file) =>
        uploadProductImage(file, slug)
      );
      setDraft({ ...draft, images: [...draft.images, ...urls] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (!draft) return;
    run(
      () =>
        upsertProduct({
          id: draft.existing ? draft.id : draft.id || slugify(draft.name),
          name: draft.name,
          description: draft.description,
          price: Number(draft.price),
          originalPrice: draft.originalPrice ? Number(draft.originalPrice) : null,
          category: draft.category,
          images: draft.images,
          sizes: draft.sizes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          colors: draft.colors
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          stock: Number(draft.stock) || 0,
          badge: draft.badge || null,
          active: draft.active,
        }),
      () => setDraft(null)
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3">
          <span className="material-symbols-outlined text-base text-red-400">error</span>
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {!draft && (
        <button
          type="button"
          onClick={() => setDraft(emptyDraft(categories[0] ?? "Fashion"))}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500"
        >
          <span className="material-symbols-outlined text-sm">add</span> New product
        </button>
      )}

      {draft && (
        <div className="space-y-3 rounded-xl border border-purple-400/20 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white">
              {draft.existing ? `Edit ${draft.id}` : "New product"}
            </h3>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded p-1 text-white/40 hover:text-white"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Silk Scarf"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Slug {draft.existing && <span className="text-white/20">(locked)</span>}
              </label>
              <input
                value={draft.existing ? draft.id : draft.id || slugify(draft.name)}
                onChange={(e) => setDraft({ ...draft, id: slugify(e.target.value) })}
                disabled={draft.existing}
                placeholder="silk-scarf"
                className={`${inputClass} font-mono disabled:opacity-50`}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input
                list="product-categories"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className={inputClass}
              />
              <datalist id="product-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Badge</label>
              <select
                value={draft.badge}
                onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                className={inputClass}
              >
                {BADGES.map((b) => (
                  <option key={b} value={b}>
                    {b || "none"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Price (KES)</label>
              <input
                type="number"
                min="1"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Was (optional, for sale price)</label>
              <input
                type="number"
                min="0"
                value={draft.originalPrice}
                onChange={(e) => setDraft({ ...draft, originalPrice: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Stock</label>
              <input
                type="number"
                min="0"
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white/70">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  className="h-4 w-4 accent-purple-500"
                />
                Visible in shop
              </label>
            </div>
            <div>
              <label className={labelClass}>Sizes (comma separated)</label>
              <input
                value={draft.sizes}
                onChange={(e) => setDraft({ ...draft, sizes: e.target.value })}
                placeholder="S, M, L"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Colors (comma separated)</label>
              <input
                value={draft.colors}
                onChange={(e) => setDraft({ ...draft, colors: e.target.value })}
                placeholder="Black, Brown, Cream"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <label className={labelClass}>Images</label>
            <div className="flex flex-wrap gap-2">
              {draft.images.map((url) => (
                <div
                  key={url}
                  className="group relative h-16 w-16 overflow-hidden rounded-lg border border-white/10"
                >
                  {/* Unoptimized: Storage URLs aren't in next.config remotePatterns */}
                  <Image
                    src={url}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="64px"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, images: draft.images.filter((i) => i !== url) })
                    }
                    className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <span className="material-symbols-outlined text-base text-red-400">
                      delete
                    </span>
                  </button>
                </div>
              ))}

              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-white/15 text-white/30 transition-colors hover:border-purple-400/40 hover:text-purple-300">
                <span className="material-symbols-outlined text-base">
                  {uploading ? "hourglass_top" : "add_photo_alternate"}
                </span>
                <span className="text-[8px] font-black uppercase">
                  {uploading ? "…" : "Upload"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => void handleUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-1.5 text-[9px] text-white/25">
              First image is the one shown on cards. Max 5MB each.
            </p>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={busy || uploading}
            className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : draft.existing ? "Save changes" : "Create product"}
          </button>
        </div>
      )}

      {/* Catalogue */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {products.length === 0 ? (
          <EmptyState icon="inventory_2" message="No products yet" />
        ) : (
          <ul className="divide-y divide-white/5">
            {products.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-800">
                  <Image
                    src={product.image}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-xs font-black text-white">{product.name}</p>
                    {product.badge && (
                      <span className="rounded bg-purple-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-300">
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/40">
                    {product.category} · {formatKes(product.price)}
                    {product.originalPrice && (
                      <span className="ml-1 line-through text-white/20">
                        {formatKes(product.originalPrice)}
                      </span>
                    )}
                    {" · "}
                    <span className={product.stock === 0 ? "text-red-400" : undefined}>
                      {product.stock ?? 0} in stock
                    </span>
                  </p>
                  <p className="font-mono text-[9px] text-white/20">{product.id}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => setProductActive(product.id, false))}
                    title="Hide from shop"
                    className="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-50"
                    aria-label="Hide product"
                  >
                    <span className="material-symbols-outlined text-base">visibility_off</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(draftFrom(product))}
                    className="rounded p-1 text-purple-300/60 hover:bg-purple-500/10 hover:text-purple-300"
                    aria-label="Edit product"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <DeleteProductButton
                    busy={busy}
                    onConfirm={() => run(() => deleteProduct(product.id))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DeleteProductButton({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
        aria-label="Delete product"
      >
        <span className="material-symbols-outlined text-base">delete</span>
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="rounded bg-red-500/20 px-1.5 py-1 text-[9px] font-black uppercase text-red-300 hover:bg-red-500/30 disabled:opacity-50"
      >
        Sure?
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded p-1 text-white/40 hover:text-white"
        aria-label="Cancel"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </span>
  );
}
