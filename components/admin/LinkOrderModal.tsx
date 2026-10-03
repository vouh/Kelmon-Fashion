"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  dropdownInputClass,
  dropdownListClass,
  useAnchoredDropdown,
} from "@/components/admin/useAnchoredDropdown";
import { useRouter } from "next/navigation";
import { formatKes } from "@/components/admin/ui";
import { linkOrder, listLinkableClients, type LinkableClient } from "@/app/admin/actions";
import ProductPicker from "@/components/admin/ProductPicker";
import type { Product } from "@/lib/products";
import type { OrderWithItems } from "@/lib/supabase/orders";

// text-base on phones: iOS zooms the page into any input under 16px.
const miniInputClass =
  "rounded-lg border border-white/10 bg-zinc-800 px-2 py-1.5 text-base text-white focus:border-purple-400/50 focus:outline-none sm:text-xs";
const labelText = "mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/40";

interface Pick {
  key: number;
  product: Product;
  size: string;
  color: string;
  price: string;
  quantity: number;
}

let nextKey = 1;

/**
 * Opened from the yellow "!" on an order: link a quick or typed-in order to
 * the client's account and/or the catalogue products it was really for.
 */
export default function LinkOrderModal({
  order,
  products,
  onClose,
  onLinked,
}: {
  order: OrderWithItems;
  products: Product[];
  onClose: () => void;
  /** After a save, with the order's id — new if linking products renamed it. */
  onLinked?: (orderId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<LinkableClient[] | null>(null);
  const [client, setClient] = useState<LinkableClient | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);

  const unlinked = (order.order_items ?? []).filter((item) => !item.product_id);
  const unlinkedTotal = unlinked.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const picksTotal = picks.reduce((sum, p) => sum + (Number(p.price) > 0 ? Number(p.price) * p.quantity : 0), 0);
  const needsProducts = unlinked.length > 0;
  const needsClient = !order.user_id;

  useEffect(() => {
    if (!needsClient) return;
    let live = true;
    void listLinkableClients().then((result) => {
      if (!live) return;
      if (result.ok) setClients(result.clients);
      else setError(result.error);
    });
    return () => {
      live = false;
    };
  }, [needsClient]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function addPick(product: Product) {
    setPicks((prev) => [
      ...prev,
      {
        key: nextKey++,
        product,
        size: "",
        color: "",
        // A single product for a single quick payment: assume it cost what was paid.
        price: String(prev.length === 0 && unlinked.length > 0 ? unlinkedTotal : product.price),
        quantity: 1,
      },
    ]);
  }

  function updatePick(key: number, patch: Partial<Pick>) {
    setPicks((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function save() {
    setError(null);
    if (!client && picks.length === 0) return setError("Pick a client or a product to link.");
    if (picks.some((p) => !(Number(p.price) > 0))) return setError("Enter a price for each product.");

    startTransition(async () => {
      const result = await linkOrder(order.id, {
        userId: client?.id,
        items: picks.length
          ? picks.map((p) => ({
              productId: p.product.id,
              variant: [p.color, p.size].filter(Boolean).join(" / ") || undefined,
              price: Number(p.price),
              quantity: p.quantity,
            }))
          : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onLinked?.(result.orderId);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <button type="button" aria-label="Close" onClick={() => !pending && onClose()} className="absolute inset-0 cursor-default" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-order-title"
        className="relative flex max-h-full w-full flex-col rounded-2xl border border-amber-400/20 bg-zinc-900 shadow-2xl max-w-md"
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-black">!</span>
          <div className="min-w-0 flex-1">
            <h2 id="link-order-title" className="text-sm font-black text-white">
              Link order
            </h2>
            <p className="truncate font-mono text-[10px] text-white/35">
              {order.id} · {formatKes(order.total)} · {order.payment_status}
              {order.phone && ` · ${order.phone}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="-mr-1 rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* Client */}
          <section>
            <span className={labelText}>Client</span>
            {!needsClient ? (
              <p className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white/70">
                Linked to <strong className="text-white">{order.customer_name}</strong>
              </p>
            ) : client ? (
              <div className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-3 py-2.5">
                <span className="material-symbols-outlined text-lg text-purple-300">person</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{client.name || client.email || "No name"}</p>
                  <p className="truncate text-[11px] text-white/40">{[client.phone, client.email].filter(Boolean).join(" · ")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setClient(null)}
                  className="rounded-lg p-1.5 text-white/40 hover:text-white"
                  aria-label="Change client"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            ) : (
              <ClientPicker clients={clients} paidPhone={order.phone} onPick={setClient} />
            )}
          </section>

          {/* Products */}
          <section>
            <span className={labelText}>Products</span>
            {!needsProducts ? (
              <p className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white/70">All items are linked to products.</p>
            ) : (
              <>
                <p className="mb-2 rounded-xl bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200/80">
                  To link: {unlinked.map((item) => `${item.quantity}× ${item.name}`).join(", ")} ({formatKes(unlinkedTotal)})
                </p>
                {picks.length > 0 && (
                  <ul className="mb-2 divide-y divide-white/5 rounded-xl border border-white/10 bg-zinc-800/40">
                    {picks.map((p) => (
                      <li key={p.key} className="space-y-1.5 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{p.product.name}</p>
                          <button
                            type="button"
                            onClick={() => setPicks((prev) => prev.filter((x) => x.key !== p.key))}
                            className="-mr-1 rounded-lg p-1.5 text-white/30 hover:text-red-300"
                            aria-label={`Remove ${p.product.name}`}
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={p.price}
                            onChange={(e) => updatePick(p.key, { price: e.target.value })}
                            aria-label="Price each"
                            className={`${miniInputClass} w-20`}
                          />
                          <span className="text-xs text-white/30">×</span>
                          <div className="flex items-center rounded-lg border border-white/10 bg-zinc-800">
                            <button
                              type="button"
                              disabled={p.quantity <= 1}
                              onClick={() => updatePick(p.key, { quantity: p.quantity - 1 })}
                              className="px-2.5 py-1.5 text-white/60 disabled:opacity-30"
                              aria-label="Fewer"
                            >
                              <span className="material-symbols-outlined text-base">remove</span>
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-white">{p.quantity}</span>
                            <button
                              type="button"
                              disabled={p.quantity >= 99}
                              onClick={() => updatePick(p.key, { quantity: p.quantity + 1 })}
                              className="px-2.5 py-1.5 text-white/60 disabled:opacity-30"
                              aria-label="More"
                            >
                              <span className="material-symbols-outlined text-base">add</span>
                            </button>
                          </div>
                          {(p.product.colors?.length ?? 0) > 0 && (
                            <select
                              value={p.color}
                              onChange={(e) => updatePick(p.key, { color: e.target.value })}
                              aria-label="Colour"
                              className={miniInputClass}
                            >
                              <option value="">Colour</option>
                              {p.product.colors!.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          )}
                          {(p.product.sizes?.length ?? 0) > 0 && (
                            <select
                              value={p.size}
                              onChange={(e) => updatePick(p.key, { size: e.target.value })}
                              aria-label="Size"
                              className={miniInputClass}
                            >
                              <option value="">Size</option>
                              {p.product.sizes!.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <ProductPicker
                  products={products}
                  onPick={addPick}
                  placeholder={picks.length ? "Add another product…" : "Search or pick a product…"}
                />
                {picks.length > 0 && Math.abs(picksTotal - unlinkedTotal) >= 1 && (
                  <p className="mt-2 text-[11px] text-amber-300/80">
                    These add up to {formatKes(picksTotal)}, but {formatKes(unlinkedTotal)} was charged. The order
                    total stays {formatKes(order.total)}.
                  </p>
                )}
              </>
            )}
          </section>

          {error && (
            <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-white/5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || (!client && picks.length === 0)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">link</span>
            {pending ? "Saving…" : "Save links"}
          </button>
          {picks.length > 0 && (
            <p className="mt-2 text-center text-[10px] text-white/30">{order.payment_status === "paid" ? "Stock comes off now. " : ""}The order number changes to the product&apos;s code.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Last 9 digits, so 07…, 2547… and +2547… compare equal. */
function phoneKey(phone: string | null): string {
  return (phone ?? "").replace(/\D/g, "").slice(-9);
}

/**
 * Client search with the same floating dropdown as the product picker:
 * tapping the box lists every client — those whose phone matches the payment
 * first — and typing narrows it down by name, email or phone.
 */
function ClientPicker({
  clients,
  paidPhone,
  onPick,
}: {
  clients: LinkableClient[] | null;
  paidPhone: string;
  onPick: (client: LinkableClient) => void;
}) {
  const [query, setQuery] = useState("");
  const { open, setOpen, anchorRef, listRef, box } = useAnchoredDropdown();

  const paidKey = phoneKey(paidPhone);
  const { samePhone, others } = useMemo(() => {
    const term = query.trim().toLowerCase();
    const digits = term.replace(/\D/g, "").replace(/^(254|0)/, "");
    const list = (clients ?? []).filter(
      (c) =>
        !term ||
        (c.name ?? "").toLowerCase().includes(term) ||
        (c.email ?? "").toLowerCase().includes(term) ||
        (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))
    );
    const matchesPaid = (c: LinkableClient) => paidKey.length === 9 && phoneKey(c.phone) === paidKey;
    return { samePhone: list.filter(matchesPaid), others: list.filter((c) => !matchesPaid(c)) };
  }, [clients, query, paidKey]);

  function pick(client: LinkableClient) {
    onPick(client);
    setQuery("");
    setOpen(false);
  }

  const row = (c: LinkableClient) => (
    <li key={c.id} className="border-b border-white/5 last:border-0">
      <button
        type="button"
        onClick={() => pick(c)}
        className="w-full px-3 py-2.5 text-left active:bg-white/10 sm:hover:bg-white/5"
      >
        <p className="truncate text-sm font-bold text-white">{c.name || c.email || "No name"}</p>
        <p className="truncate text-[11px] text-white/40">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
      </button>
    </li>
  );

  return (
    <div>
      <div ref={anchorRef} className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-white/30">
          person_search
        </span>
        <input
          type="search"
          value={query}
          disabled={!clients}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          placeholder={clients ? "Search or pick a client…" : "Loading clients…"}
          role="combobox"
          aria-expanded={open}
          aria-controls="client-picker-list"
          className={dropdownInputClass}
        />
        <button
          type="button"
          disabled={!clients}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Hide clients" : "Show all clients"}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 hover:text-white disabled:opacity-40"
        >
          <span className={`material-symbols-outlined text-xl transition-transform ${open ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>
      </div>

      {open && box && clients && (
        <ul
          ref={listRef}
          id="client-picker-list"
          style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
          className={dropdownListClass}
        >
          {samePhone.length > 0 && (
            <li className="px-3 pt-2 text-[10px] font-black uppercase tracking-widest text-green-300">
              Same phone as the payment
            </li>
          )}
          {samePhone.map(row)}
          {samePhone.length > 0 && others.length > 0 && (
            <li className="border-t border-white/10 px-3 pt-2 text-[10px] font-black uppercase tracking-widest text-white/35">
              All clients
            </li>
          )}
          {others.map(row)}
          {samePhone.length + others.length === 0 && (
            <li className="px-3 py-2.5 text-xs text-white/40">
              {clients.length === 0 ? "No client accounts yet." : "No client matches. They may not have an account yet."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
