"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { EmptyState, formatKes } from "@/components/admin/ui";
import {
  adjustProductStock,
  deleteProduct,
  setProductActive,
  upsertProduct,
} from "@/app/admin/actions";
import { compressImage } from "@/lib/images/compress";
import { uploadProductImage } from "@/lib/supabase/storage";
import type { Product } from "@/lib/products";

/**
 * The badge values products.badge accepts. Typed as a literal union rather than
 * string[] so the <select> and the Zod schema in lib/validation cannot drift —
 * adding a badge here without adding it there is now a type error.
 */
const BADGES = ["", "New", "Hot", "Sale"] as const;
type Badge = (typeof BADGES)[number];

/** Mirrors the max in productInputSchema. */
const MAX_IMAGES = 4;

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
  colors: string[];
  /** Colour → photo URL; colours without one keep the current photo in the shop. */
  colorImages: Record<string, string>;
  stock: string;
  badge: Badge;
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
    colors: [],
    colorImages: {},
    stock: "1",
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
    colors: product.colors ?? [],
    colorImages: product.colorImages ?? {},
    stock: String(product.stock ?? 0),
    badge: (product.badge ?? "") as Badge,
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
   * Compresses each photo in the browser (see lib/images/compress.ts), then
   * uploads straight to the product-images bucket. Writes there are admin-only
   * by RLS, checked against the Firebase token the Supabase client sends.
   */
  async function handleUpload(files: FileList | null) {
    if (!files?.length || !draft) return;
    setError(null);

    const room = MAX_IMAGES - draft.images.length;
    if (room <= 0) {
      setError(`A product can have at most ${MAX_IMAGES} photos. Remove one first.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) {
      setError(`Only ${room} more photo${room === 1 ? "" : "s"} added — the limit is ${MAX_IMAGES}.`);
    }

    setUploading(true);
    try {
      const slug = draft.id || slugify(draft.name) || "product";
      const urls: string[] = [];
      for (const file of picked) {
        urls.push(await uploadProductImage(await compressImage(file), slug));
      }
      setDraft((d) => (d ? { ...d, images: [...d.images, ...urls] } : d));
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
          colors: draft.colors,
          colorImages: Object.fromEntries(
            Object.entries(draft.colorImages).filter(([color]) => draft.colors.includes(color))
          ),
          stock: Number(draft.stock) || 0,
          badge: draft.badge === "" ? null : draft.badge,
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
          onClick={() => setDraft(emptyDraft(categories[0] ?? "Accessories"))}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500"
        >
          <span className="material-symbols-outlined text-sm">add</span> New product
        </button>
      )}

      {draft && (
        <div className="space-y-4 rounded-xl border border-purple-400/20 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-white">
              {draft.existing ? `Edit ${draft.name || draft.id}` : "New product"}
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

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className={labelClass}>Name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Silk Scarf"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Price (KES)</label>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="1500"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Quantity in stock</label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                className={inputClass}
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
            <div className="sm:col-span-3">
              <label className={labelClass}>Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={4}
                placeholder="Material, size, what makes it special…"
                className={inputClass}
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className={labelClass}>
              Photos ({draft.images.length}/{MAX_IMAGES})
            </label>
            <div className="flex flex-wrap gap-2">
              {draft.images.map((url, index) => (
                <div
                  key={url}
                  className="group relative h-20 w-20 overflow-hidden rounded-lg border border-white/10"
                >
                  {/* Unoptimized: a tiny admin thumbnail of an already-compressed file */}
                  <Image
                    src={url}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="80px"
                  />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-purple-600 px-1 text-[8px] font-black uppercase text-white">
                      Cover
                    </span>
                  )}
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

              {draft.images.length < MAX_IMAGES && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-white/15 text-white/30 transition-colors hover:border-purple-400/40 hover:text-purple-300">
                  <span className="material-symbols-outlined text-base">
                    {uploading ? "hourglass_top" : "add_photo_alternate"}
                  </span>
                  <span className="text-[8px] font-black uppercase">
                    {uploading ? "Uploading…" : "Add photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={(e) => {
                      void handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="mt-1.5 text-[9px] text-white/25">
              Up to {MAX_IMAGES} photos; the first is the cover shown on cards. Photos are
              resized and compressed before upload so the shop loads fast.
            </p>
          </div>

          <ColorEditor
            colors={draft.colors}
            colorImages={draft.colorImages}
            photos={draft.images}
            slug={draft.id || slugify(draft.name) || "product"}
            onChange={(colors, colorImages) =>
              setDraft((d) => (d ? { ...d, colors, colorImages } : d))
            }
            onError={setError}
          />

          <details className="rounded-lg border border-white/5 px-3 py-2">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-white/40">
              More options
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                <label className={labelClass}>Badge</label>
                <select
                  value={draft.badge}
                  onChange={(e) => setDraft({ ...draft, badge: e.target.value as Badge })}
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
                <label className={labelClass}>Was (optional, for sale price)</label>
                <input
                  type="number"
                  min="0"
                  value={draft.originalPrice}
                  onChange={(e) => setDraft({ ...draft, originalPrice: e.target.value })}
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
            </div>
          </details>

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
              <li key={product.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
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
                    <span className={!product.stock ? "text-red-400" : undefined}>
                      {product.stock ? `${product.stock} in stock` : "Sold out — hidden from shop"}
                    </span>
                  </p>
                  <p className="font-mono text-[9px] text-white/20">{product.id}</p>
                </div>

                <StockAdjuster
                  stock={product.stock ?? 0}
                  busy={busy}
                  onAdjust={(delta) => run(() => adjustProductStock(product.id, delta))}
                />

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

/** Mirrors the max in productInputSchema. */
const MAX_COLORS = 24;

/**
 * Colours the shopper can pick, each optionally tied to a photo. Picking a
 * colour on the product page swaps the main image to its photo; a colour with
 * no photo just keeps whatever is showing. No colours means no picker at all.
 */
function ColorEditor({
  colors,
  colorImages,
  photos,
  slug,
  onChange,
  onError,
}: {
  colors: string[];
  colorImages: Record<string, string>;
  photos: string[];
  slug: string;
  onChange: (colors: string[], colorImages: Record<string, string>) => void;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  function add() {
    const color = name.trim().replace(/\s+/g, " ");
    if (!color) return;
    if (color.length > 40) return onError("Colour names must be 40 characters or fewer.");
    if (colors.some((c) => c.toLowerCase() === color.toLowerCase())) {
      return onError(`${color} is already on the list.`);
    }
    if (colors.length >= MAX_COLORS) return onError(`A product can have at most ${MAX_COLORS} colours.`);
    onError(null);
    onChange([...colors, color], colorImages);
    setName("");
    setPicking(color);
  }

  function remove(color: string) {
    const rest = { ...colorImages };
    delete rest[color];
    onChange(
      colors.filter((c) => c !== color),
      rest
    );
    if (picking === color) setPicking(null);
  }

  function setPhoto(color: string, url: string | null) {
    const next = { ...colorImages };
    if (url) next[color] = url;
    else delete next[color];
    onChange(colors, next);
  }

  async function upload(color: string, file: File | undefined) {
    if (!file) return;
    onError(null);
    setUploading(color);
    try {
      setPhoto(color, await uploadProductImage(await compressImage(file), slug));
      setPicking(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      <label className={labelClass}>Colours ({colors.length})</label>

      {colors.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {colors.map((color) => {
            const photo = colorImages[color];
            const open = picking === color;
            return (
              <li key={color} className="rounded-lg border border-white/10 bg-zinc-800/60">
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setPicking(open ? null : color)}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-white/15 text-white/30 hover:border-purple-400/50 hover:text-purple-300"
                    aria-label={photo ? `Change photo for ${color}` : `Add photo for ${color}`}
                  >
                    {photo ? (
                      <Image src={photo} alt="" fill unoptimized className="object-cover" sizes="36px" />
                    ) : (
                      <span className="material-symbols-outlined text-base">add_photo_alternate</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{color}</p>
                    <p className="text-[9px] text-white/30">
                      {photo ? "Photo swaps in when picked" : "No photo, keeps the current one"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPicking(open ? null : color)}
                    className="rounded px-2 py-1 text-[9px] font-black uppercase tracking-wide text-purple-300 hover:bg-purple-400/10"
                  >
                    {open ? "Done" : photo ? "Change photo" : "Add photo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(color)}
                    className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Remove ${color}`}
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {open && (
                  <div className="border-t border-white/5 px-2 py-2">
                    <p className="mb-1.5 text-[9px] font-bold text-white/40">
                      Pick one of the product photos, or upload one just for {color}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {photos.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => {
                            setPhoto(color, url);
                            setPicking(null);
                          }}
                          className={`relative h-14 w-14 overflow-hidden rounded-md border-2 ${
                            photo === url ? "border-purple-400" : "border-transparent hover:border-purple-400/40"
                          }`}
                          aria-label="Use this photo"
                        >
                          <Image src={url} alt="" fill unoptimized className="object-cover" sizes="56px" />
                        </button>
                      ))}
                      <label className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-white/15 text-white/30 hover:border-purple-400/40 hover:text-purple-300">
                        <span className="material-symbols-outlined text-base">
                          {uploading === color ? "hourglass_top" : "upload"}
                        </span>
                        <span className="text-[8px] font-black uppercase">
                          {uploading === color ? "Uploading" : "Upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploading !== null}
                          onChange={(e) => {
                            void upload(color, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                      </label>
                      {photo && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhoto(color, null);
                            setPicking(null);
                          }}
                          className="flex h-14 items-center rounded-md border border-white/10 px-2 text-[9px] font-black uppercase text-white/40 hover:text-red-300"
                        >
                          No photo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={colors.length ? "Add another colour" : "e.g. Black"}
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-purple-400/30 bg-purple-400/10 px-3 text-[10px] font-black uppercase tracking-wide text-purple-300 hover:bg-purple-400/20 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-sm">add</span> Add
        </button>
      </div>
      <p className="mt-1.5 text-[9px] text-white/25">
        Leave empty if the product comes in one colour; the shop then shows no colour picker.
      </p>
    </div>
  );
}

/**
 * Manual stock control for sales made outside the site, damaged items or a
 * restock. Payments through the site take stock off on their own.
 */
function StockAdjuster({
  stock,
  busy,
  onAdjust,
}: {
  stock: number;
  busy: boolean;
  onAdjust: (delta: number) => void;
}) {
  // null while not being edited, so the box always shows the live stock.
  const [typed, setTyped] = useState<string | null>(null);

  /** Typing a number sets the stock to it; saved on Enter or when the box loses focus. */
  function commit() {
    if (typed === null) return;
    const target = Math.floor(Number(typed));
    setTyped(null);
    if (Number.isFinite(target) && target >= 0 && target !== stock) {
      onAdjust(target - stock);
    }
  }

  const stepClass =
    "flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-zinc-800 text-white/70 transition hover:border-purple-400/40 hover:text-white disabled:opacity-40";

  return (
    <div className="flex shrink-0 items-center gap-1" title="Stock">
      <button
        type="button"
        disabled={busy || stock === 0}
        onClick={() => onAdjust(-1)}
        className={stepClass}
        aria-label="Decrease stock by one"
      >
        <span className="material-symbols-outlined text-base">remove</span>
      </button>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={typed ?? String(stock)}
        disabled={busy}
        onChange={(e) => setTyped(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setTyped(null);
        }}
        className="h-7 w-14 rounded-md border border-white/10 bg-zinc-800 text-center text-xs font-bold text-white focus:border-purple-400/50 focus:outline-none disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Stock quantity"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => onAdjust(1)}
        className={stepClass}
        aria-label="Increase stock by one"
      >
        <span className="material-symbols-outlined text-base">add</span>
      </button>
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
