"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addInventoryItem,
  adjustInventorySold,
  createInventory,
  deleteInventory,
  deleteInventoryItem,
  updateInventory,
  updateInventoryItem,
  type FinanceResult,
} from "@/app/admin/finance-actions";
import BarChart from "@/components/admin/BarChart";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import { EmptyState, StatCard, TD, TH, formatKes } from "@/components/admin/ui";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { dateRangeBounds, dateRangeLabel, isInDateRange, kenyaToday, writeDateRangeToUrl, type DateRange } from "@/lib/date-range";
import { inventoryNameFor, lineTotals, marginPercent, sumTotals, type FinanceTotals } from "@/lib/finance";
import type { InventoryWithItems, PaidSale } from "@/lib/supabase/finance";
import type { InventoryItemRow } from "@/lib/supabase/types";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 [color-scheme:dark] focus:border-purple-400/50 focus:outline-none disabled:opacity-60";
const labelClass = "mb-1 block text-[9px] font-black uppercase tracking-widest text-white/30";
const VIEW_KEY = "kelmon-admin-finance-view";

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-40";

type ProductOption = { id: string; name: string; code: string | null };

type ItemDraft = {
  key: string;
  name: string;
  productId: string;
  buyPrice: string;
  sellPrice: string;
  quantity: string;
  sold: string;
};

let draftKey = 0;
const emptyItem = (): ItemDraft => ({
  key: `new-${++draftKey}`,
  name: "",
  productId: "",
  buyPrice: "",
  sellPrice: "",
  quantity: "1",
  sold: "0",
});

function itemFrom(row: InventoryItemRow): ItemDraft {
  return {
    key: row.id,
    name: row.name,
    productId: row.product_id ?? "",
    buyPrice: String(row.buy_price),
    sellPrice: String(row.sell_price),
    quantity: String(row.quantity),
    sold: String(row.sold),
  };
}

/** A draft's numbers for the live previews; blanks count as 0. */
function draftLine(item: ItemDraft) {
  const n = (v: string) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
  return { buy_price: n(item.buyPrice), sell_price: n(item.sellPrice), quantity: n(item.quantity), sold: n(item.sold) };
}

function toInput(item: ItemDraft) {
  return {
    name: item.name,
    productId: item.productId || null,
    buyPrice: Number(item.buyPrice),
    sellPrice: Number(item.sellPrice),
    quantity: Number(item.quantity),
    sold: Number(item.sold || 0),
  };
}

/** Money coloured by sign: green for profit, red for a loss. */
function Signed({ value, className = "" }: { value: number; className?: string }) {
  const tone = value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-white/50";
  return <span className={`${tone} ${className}`}>{value < 0 ? `− ${formatKes(-value)}` : formatKes(value)}</span>;
}

function formatDay(day: string) {
  return inventoryNameFor(day);
}

export default function FinanceManager({
  inventories,
  sales,
  products,
  initialRange,
}: {
  inventories: InventoryWithItems[];
  sales: PaidSale[];
  products: ProductOption[];
  initialRange: DateRange;
}) {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<"all" | "unsold" | "soldout">("all");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"numbers" | "charts">("numbers");

  // Remember the Numbers / Charts choice per browser.
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "charts") setView("charts");
    } catch {}
  }, []);
  function changeView(next: "numbers" | "charts") {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  }

  const closeCreate = useCallback(() => setCreating(false), []);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function changeRange(next: DateRange) {
    setRange(next);
    writeDateRangeToUrl(next);
  }

  // Filters: the date applies to the trip; the search and stock filters to its
  // items, and a trip with no matching items is hidden.
  const visible = useMemo(() => {
    const bounds = dateRangeBounds(range);
    const q = query.trim().toLowerCase();
    return inventories
      .filter((inv) => isInDateRange(`${inv.purchased_on}T12:00:00+03:00`, bounds))
      .map((inv) => {
        const nameMatch = q !== "" && inv.name.toLowerCase().includes(q);
        const items = inv.items.filter((item) => {
          if (stock === "unsold" && item.sold >= item.quantity) return false;
          if (stock === "soldout" && item.sold < item.quantity) return false;
          if (q === "" || nameMatch) return true;
          const product = item.product_id ? productById.get(item.product_id) : undefined;
          return [item.name, product?.name, product?.code].some((v) => v?.toLowerCase().includes(q));
        });
        return { ...inv, items };
      })
      .filter((inv) => inv.items.length > 0 || (q === "" && stock === "all") || (q !== "" && inv.name.toLowerCase().includes(q)));
  }, [inventories, range, query, stock, productById]);

  const totals = useMemo(() => sumTotals(visible.flatMap((inv) => inv.items)), [visible]);
  const storeSales = useMemo(() => {
    const bounds = dateRangeBounds(range);
    const inRange = sales.filter((s) => isInDateRange(s.at, bounds));
    return { count: inRange.length, total: inRange.reduce((sum, s) => sum + s.total, 0) };
  }, [sales, range]);

  const filtered = query.trim() !== "" || stock !== "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter value={range} onChange={changeRange} />
        <div className="relative min-w-[180px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/30">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items or inventories, e.g. bags"
            aria-label="Search items or inventories"
            className={`${inputClass} min-h-[38px] pl-8`}
          />
        </div>
        <select
          value={stock}
          onChange={(e) => setStock(e.target.value as typeof stock)}
          aria-label="Filter by stock"
          className={`${inputClass} min-h-[38px] w-auto`}
        >
          <option value="all">All stock</option>
          <option value="unsold">Still has stock</option>
          <option value="soldout">Sold out</option>
        </select>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={creating}
          className={`${buttonClass} min-h-[38px] bg-purple-600 text-white hover:bg-purple-500`}
        >
          <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
          New inventory
        </button>
      </div>

      <div className="flex justify-end">
        <div role="group" aria-label="Show totals as" className="inline-flex rounded-xl border border-white/10 bg-zinc-900 p-0.5">
          {(
            [
              { value: "numbers", label: "Numbers", icon: "grid_view" },
              { value: "charts", label: "Charts", icon: "bar_chart" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => changeView(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                view === option.value ? "bg-purple-600 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {view === "charts" ? (
        <FinanceCharts inventories={visible} totals={totals} rangeLabel={dateRangeLabel(range)} />
      ) : (
        <Summary totals={totals} rangeLabel={dateRangeLabel(range)} filtered={filtered} storeSales={storeSales} />
      )}

      {creating && <NewInventory products={products} onDone={closeCreate} />}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-zinc-900">
          <EmptyState
            icon="account_balance_wallet"
            message={
              inventories.length === 0
                ? "No inventories yet — add your first buying trip"
                : "Nothing matches these filters"
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((inv) => (
            <InventoryCard
              key={inv.id}
              inventory={inv}
              allItemCount={inventories.find((i) => i.id === inv.id)?.items.length ?? inv.items.length}
              products={products}
              productById={productById}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Summary ────────────────────────────────────────────────────────────────

function Summary({
  totals,
  rangeLabel,
  filtered,
  storeSales,
}: {
  totals: FinanceTotals;
  rangeLabel: string;
  filtered: boolean;
  storeSales: { count: number; total: number };
}) {
  const margin = marginPercent(totals.expectedProfit, totals.invested);
  const soldShare = totals.pieces > 0 ? Math.round((totals.sold / totals.pieces) * 100) : 0;
  const hint = `${rangeLabel}${filtered ? " · filtered" : ""}`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Total invested" value={formatKes(totals.invested)} hint={`What the stock cost · ${hint}`} icon="shopping_cart" iconColor="text-amber-300" />
        <StatCard label="Revenue" value={formatKes(totals.revenue)} hint={`From ${totals.sold} piece${totals.sold === 1 ? "" : "s"} sold`} icon="payments" iconColor="text-green-400" />
        <StatCard label="Actual profit" value={<Signed value={totals.profit} />} hint="Profit on what has sold" icon="savings" iconColor="text-green-400" />
        <StatCard
          label="Expected profit"
          value={<Signed value={totals.expectedProfit} />}
          hint={margin === null ? "If everything sells" : `If everything sells · ${margin}% on cost`}
          icon="trending_up"
          iconColor="text-blue-400"
        />
        <StatCard label="Expected revenue" value={formatKes(totals.expectedRevenue)} hint="If everything sells" icon="request_quote" iconColor="text-blue-400" />
        <StatCard
          label="Net cash"
          value={<Signed value={totals.netCash} />}
          hint={totals.netCash < 0 ? "Still to recover from sales" : "Stock has paid for itself"}
          icon="account_balance_wallet"
        />
        <StatCard label="Stock left (at cost)" value={formatKes(totals.stockValueLeft)} hint={`${totals.pieces - totals.sold} unsold piece${totals.pieces - totals.sold === 1 ? "" : "s"}`} icon="inventory_2" iconColor="text-purple-300" />
        <StatCard label="Pieces sold" value={`${totals.sold} / ${totals.pieces}`} hint={`${soldShare}% of stock sold`} icon="sell" iconColor="text-pink-300" />
      </div>

      {/* Tie-in with the online shop: paid orders for the same dates. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-green-400">storefront</span>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-white/30">
              Online shop sales · {rangeLabel}
            </span>
            <span className="text-sm font-black text-white">{formatKes(storeSales.total)}</span>
            <span className="ml-2 text-[11px] font-bold text-white/40">
              from {storeSales.count} paid order{storeSales.count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/transactions?filter=success" className={`${buttonClass} border border-white/10 text-white/60 hover:text-white`}>
            <span className="material-symbols-outlined text-sm">payments</span>
            Payments
          </Link>
          <Link href="/admin/stats" className={`${buttonClass} border border-white/10 text-white/60 hover:text-white`}>
            <span className="material-symbols-outlined text-sm">bar_chart</span>
            Statistics
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Charts ─────────────────────────────────────────────────────────────────

const shortDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};
const shortLabel = (text: string) => (text.length > 10 ? `${text.slice(0, 9)}…` : text);

/** A part-of-whole meter: one hue on a recessive track, with its numbers in text. */
function Meter({ label, value, of, detail }: { label: string; value: number; of: number; detail: string }) {
  const pct = of > 0 ? Math.min(100, Math.round((value / of) * 100)) : 0;
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-black text-white">{label}</h3>
        <span className="text-lg font-black text-white">{pct}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[11px] font-bold text-white/45">{detail}</p>
    </div>
  );
}

/**
 * The same totals as pictures. Each chart is one measure in KES, so no chart
 * mixes scales; inventories run oldest to newest, left to right.
 */
function FinanceCharts({
  inventories,
  totals,
  rangeLabel,
}: {
  inventories: InventoryWithItems[];
  totals: FinanceTotals;
  rangeLabel: string;
}) {
  if (inventories.length === 0 || totals.pieces === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-zinc-900">
        <EmptyState icon="bar_chart" message="No stock in this range to chart yet" />
      </div>
    );
  }

  // Newest 12 trips, shown oldest first.
  const trips = [...inventories]
    .sort((a, b) => a.purchased_on.localeCompare(b.purchased_on) || a.created_at.localeCompare(b.created_at))
    .slice(-12)
    .map((inv) => ({ label: shortDay(inv.purchased_on), totals: sumTotals(inv.items) }));

  // Items with the same name across trips ("Bags") count as one.
  const byItem = new Map<string, { label: string; value: number }>();
  for (const item of inventories.flatMap((inv) => inv.items)) {
    const key = item.name.trim().toLowerCase();
    const entry = byItem.get(key) ?? { label: shortLabel(item.name.trim()), value: 0 };
    entry.value += lineTotals(item).expectedProfit;
    byItem.set(key, entry);
  }
  const topItems = [...byItem.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((d) => ({ label: d.label, value: Math.max(0, Math.round(d.value)) }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Meter
          label="Money recovered"
          value={totals.revenue}
          of={totals.invested}
          detail={`${formatKes(totals.revenue)} earned of ${formatKes(totals.invested)} invested · ${rangeLabel}`}
        />
        <Meter
          label="Stock sold"
          value={totals.sold}
          of={totals.pieces}
          detail={`${totals.sold} of ${totals.pieces} pieces sold · profit so far ${formatKes(Math.round(totals.profit))} of ${formatKes(Math.round(totals.expectedProfit))} expected`}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <BarChart
          title="Invested per inventory"
          data={trips.map((t) => ({ label: t.label, value: Math.round(t.totals.invested) }))}
          valueFormat="kes"
          labelHeading="Inventory"
        />
        <BarChart
          title="Revenue per inventory"
          data={trips.map((t) => ({ label: t.label, value: Math.round(t.totals.revenue) }))}
          valueFormat="kes"
          labelHeading="Inventory"
        />
      </div>
      <BarChart title="Expected profit by item (top 8)" data={topItems} valueFormat="kes" labelHeading="Item" />
    </div>
  );
}

// ── New inventory ──────────────────────────────────────────────────────────

function NewInventory({ products, onDone }: { products: ProductOption[]; onDone: () => void }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [purchasedOn, setPurchasedOn] = useState(kenyaToday());
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  const totals = sumTotals(items.map(draftLine));
  const touched = name !== "" || notes !== "" || items.some((i) => i.name || i.buyPrice || i.sellPrice || i.productId);

  // Escape closes an untouched form; one with typed-in items needs Cancel, so
  // a stray key press never throws away a whole buying trip. The page behind
  // doesn't scroll while the pop-up is open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy && !touched) onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, touched, onDone]);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const filled = items.filter((i) => i.name.trim() || i.buyPrice || i.sellPrice);
    startTransition(async () => {
      const result = await createInventory({
        name: name.trim() || undefined,
        purchasedOn,
        notes: notes.trim() || null,
        items: filled.map(toInput),
      });
      if (!result.ok) return setError(result.error);
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-inventory-title"
        className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div>
            <h3 id="new-inventory-title" className="text-sm font-black text-white">New inventory</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Everything you bought on one trip</p>
          </div>
          <button type="button" onClick={onDone} disabled={busy} className="rounded p-1 text-white/40 hover:text-white" aria-label="Close">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">

      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className={labelClass}>Date bought</span>
          <input type="date" required value={purchasedOn} max={kenyaToday()} onChange={(e) => setPurchasedOn(e.target.value)} className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={purchasedOn ? inventoryNameFor(purchasedOn) : "e.g. Monday 15 May 2026"}
            maxLength={120}
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Notes (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Gikomba, supplier name" maxLength={1000} className={inputClass} />
        </label>
      </div>

      <div className="space-y-2">
        <span className={labelClass}>What you bought</span>
        {items.map((item, index) => (
          <ItemFields
            key={item.key}
            item={item}
            products={products}
            disabled={busy}
            onChange={(next) => setItems(items.map((i) => (i.key === item.key ? next : i)))}
            onRemove={items.length > 1 ? () => setItems(items.filter((i) => i.key !== item.key)) : undefined}
            autoFocus={index === items.length - 1 && index > 0}
          />
        ))}
        <button
          type="button"
          onClick={() => setItems([...items, emptyItem()])}
          className={`${buttonClass} border border-dashed border-white/15 text-white/60 hover:text-white`}
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add another item
        </button>
      </div>
        </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-4 py-3">
        <p className="text-[11px] font-bold text-white/50">
          Spending <span className="text-white">{formatKes(totals.invested)}</span> · expected revenue{" "}
          <span className="text-white">{formatKes(totals.expectedRevenue)}</span> · expected profit <Signed value={totals.expectedProfit} />
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onDone} className={`${buttonClass} text-white/50 hover:text-white`}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={`${buttonClass} bg-purple-600 text-white hover:bg-purple-500`}>
            {busy ? "Saving…" : "Save inventory"}
          </button>
        </div>
      </div>
      {error && <p className="px-4 pb-3 text-[11px] text-red-300">{error}</p>}
      </form>
    </div>
  );
}

/** The input row for one item, with its profit worked out as you type. */
function ItemFields({
  item,
  products,
  disabled,
  onChange,
  onRemove,
  showSold = false,
  autoFocus = false,
}: {
  item: ItemDraft;
  products: ProductOption[];
  disabled?: boolean;
  onChange: (item: ItemDraft) => void;
  onRemove?: () => void;
  showSold?: boolean;
  autoFocus?: boolean;
}) {
  const line = draftLine(item);
  const t = lineTotals(line);
  const set = (patch: Partial<ItemDraft>) => onChange({ ...item, ...patch });

  function linkProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    // Picking a product fills in a blank name; a typed name is kept.
    set({ productId, name: item.name.trim() || !product ? item.name : product.name });
  }

  return (
    <div className="rounded-lg border border-white/5 bg-zinc-950/40 p-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
        <label className="col-span-2 sm:col-span-3">
          <span className={labelClass}>Item</span>
          <input
            required
            autoFocus={autoFocus}
            value={item.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Bags"
            maxLength={160}
            disabled={disabled}
            className={inputClass}
          />
        </label>
        <label className="col-span-2 sm:col-span-3">
          <span className={labelClass}>Link to product (optional)</span>
          <select value={item.productId} onChange={(e) => linkProduct(e.target.value)} disabled={disabled} className={inputClass}>
            <option value="">Not linked</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ? `${p.code} · ` : ""}
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Buy price / pc</span>
          <input required type="number" inputMode="decimal" min={0} step="any" value={item.buyPrice} onChange={(e) => set({ buyPrice: e.target.value })} placeholder="500" disabled={disabled} className={inputClass} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Sell price / pc</span>
          <input required type="number" inputMode="decimal" min={0} step="any" value={item.sellPrice} onChange={(e) => set({ sellPrice: e.target.value })} placeholder="700" disabled={disabled} className={inputClass} />
        </label>
        <label className={showSold ? "sm:col-span-1" : "sm:col-span-2"}>
          <span className={labelClass}>Qty</span>
          <input required type="number" inputMode="numeric" min={1} step={1} value={item.quantity} onChange={(e) => set({ quantity: e.target.value })} disabled={disabled} className={inputClass} />
        </label>
        {showSold && (
          <label className="sm:col-span-1">
            <span className={labelClass}>Sold</span>
            <input type="number" inputMode="numeric" min={0} max={line.quantity || undefined} step={1} value={item.sold} onChange={(e) => set({ sold: e.target.value })} disabled={disabled} className={inputClass} />
          </label>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-white/45">
        <span>
          Profit per piece <Signed value={line.sell_price - line.buy_price} /> · × {line.quantity} ={" "}
          <Signed value={t.expectedProfit} /> expected · cost {formatKes(t.invested)}
        </span>
        {onRemove && (
          <button type="button" onClick={onRemove} disabled={disabled} className="inline-flex items-center gap-1 text-red-400/60 hover:text-red-400">
            <span className="material-symbols-outlined text-sm">delete</span>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ── One inventory ──────────────────────────────────────────────────────────

function InventoryCard({
  inventory,
  allItemCount,
  products,
  productById,
}: {
  inventory: InventoryWithItems;
  /** Items before search filtering, so the header can say "3 of 5". */
  allItemCount: number;
  products: ProductOption[];
  productById: Map<string, ProductOption>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<ItemDraft | null>(null);
  const [header, setHeader] = useState({ name: inventory.name, purchasedOn: inventory.purchased_on, notes: inventory.notes ?? "" });

  const totals = sumTotals(inventory.items);

  function run(action: () => Promise<FinanceResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      after?.();
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
        {editing ? (
          <form
            className="grid flex-1 gap-2 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateInventory({ id: inventory.id, ...header }), () => setEditing(false));
            }}
          >
            <input value={header.name} onChange={(e) => setHeader({ ...header, name: e.target.value })} placeholder={inventoryNameFor(header.purchasedOn)} maxLength={120} aria-label="Inventory name" className={inputClass} />
            <input type="date" required value={header.purchasedOn} max={kenyaToday()} onChange={(e) => setHeader({ ...header, purchasedOn: e.target.value })} aria-label="Date bought" className={inputClass} />
            <input value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} placeholder="Notes" maxLength={1000} aria-label="Notes" className={inputClass} />
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" disabled={busy} className={`${buttonClass} bg-purple-600 text-white hover:bg-purple-500`}>Save</button>
              <button type="button" onClick={() => setEditing(false)} className={`${buttonClass} text-white/50 hover:text-white`}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-start gap-2 text-left" aria-expanded={open}>
            <span className="material-symbols-outlined mt-0.5 text-base text-white/40">{open ? "expand_more" : "chevron_right"}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-white">{inventory.name}</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white/30">
                {formatDay(inventory.purchased_on)} · {inventory.items.length === allItemCount ? allItemCount : `${inventory.items.length} of ${allItemCount}`} item
                {allItemCount === 1 ? "" : "s"}
                {inventory.notes ? ` · ${inventory.notes}` : ""}
              </span>
            </span>
          </button>
        )}

        {!editing && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => { setOpen(true); setAdding(emptyItem()); }} disabled={busy || adding !== null} className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-white disabled:opacity-40" aria-label="Add item" title="Add item">
              <span className="material-symbols-outlined text-base">add</span>
            </button>
            <button type="button" onClick={() => {
                setHeader({ name: inventory.name, purchasedOn: inventory.purchased_on, notes: inventory.notes ?? "" });
                setEditing(true);
              }}
              disabled={busy} className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Edit inventory" title="Edit inventory">
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete "${inventory.name}"?`,
                  message: `This removes the inventory and all ${allItemCount} item${allItemCount === 1 ? "" : "s"} in it. It can't be undone.`,
                  confirmLabel: "Delete inventory",
                  tone: "danger",
                });
                if (ok) run(() => deleteInventory(inventory.id));
              }}
              className="rounded p-1.5 text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
              aria-label="Delete inventory"
              title="Delete inventory"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Inventory totals */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-white/5 px-4 py-2.5 text-[11px] font-bold sm:grid-cols-5">
        <Figure label="Invested" value={formatKes(totals.invested)} />
        <Figure label="Revenue" value={formatKes(totals.revenue)} />
        <Figure label="Actual profit" value={<Signed value={totals.profit} />} />
        <Figure label="Expected profit" value={<Signed value={totals.expectedProfit} />} />
        <Figure label="Sold" value={`${totals.sold} / ${totals.pieces}`} />
      </div>

      {open && (
        <>
          {inventory.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-white/5">
                  <tr>
                    <th className={TH}>Item</th>
                    <th className={`${TH} text-right`}>Buy / pc</th>
                    <th className={`${TH} text-right`}>Sell / pc</th>
                    <th className={`${TH} text-right`}>Profit / pc</th>
                    <th className={`${TH} text-right`}>Qty</th>
                    <th className={`${TH} text-right`}>Invested</th>
                    <th className={`${TH} text-center`}>Sold</th>
                    <th className={`${TH} text-right`}>Revenue</th>
                    <th className={`${TH} text-right`}>Actual profit</th>
                    <th className={`${TH} text-right`}>Expected profit</th>
                    <th className={TH}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {inventory.items.map((item) => (
                    <ItemRow key={item.id} item={item} products={products} product={item.product_id ? productById.get(item.product_id) : undefined} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adding && (
            <form
              className="space-y-2 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => addInventoryItem(inventory.id, toInput(adding)), () => setAdding(null));
              }}
            >
              <ItemFields item={adding} products={products} disabled={busy} onChange={setAdding} showSold autoFocus />
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={`${buttonClass} bg-purple-600 text-white hover:bg-purple-500`}>
                  {busy ? "Adding…" : "Add item"}
                </button>
                <button type="button" onClick={() => setAdding(null)} className={`${buttonClass} text-white/50 hover:text-white`}>Cancel</button>
              </div>
            </form>
          )}

          {inventory.items.length === 0 && !adding && (
            <EmptyState icon="inventory_2" message="No items in this inventory yet" />
          )}
        </>
      )}
      {error && <p className="px-4 pb-3 text-[11px] text-red-300">{error}</p>}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[9px] font-black uppercase tracking-widest text-white/30">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

// ── One item ───────────────────────────────────────────────────────────────

function ItemRow({ item, product, products }: { item: InventoryItemRow; product?: ProductOption; products: ProductOption[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft | null>(null);

  // The +/− buttons move a local count at once and save shortly after the last
  // click, so tapping + five times is one request, not five.
  const [sold, setSold] = useState(item.sold);
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (pending.current === 0) setSold(item.sold);
  }, [item.sold]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function step(delta: number) {
    const next = Math.min(item.quantity, Math.max(0, sold + delta));
    if (next === sold) return;
    pending.current += next - sold;
    setSold(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const change = pending.current;
      startTransition(async () => {
        const result = await adjustInventorySold(item.id, change);
        pending.current -= change;
        if (!result.ok) {
          setError(result.error);
          setSold(item.sold);
          return;
        }
        router.refresh();
      });
    }, 500);
  }

  function run(action: () => Promise<FinanceResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      after?.();
      router.refresh();
    });
  }

  if (draft) {
    return (
      <tr>
        <td colSpan={11} className="p-3">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateInventoryItem(item.id, toInput(draft)), () => setDraft(null));
            }}
          >
            <ItemFields item={draft} products={products} disabled={busy} onChange={setDraft} showSold autoFocus />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={`${buttonClass} bg-purple-600 text-white hover:bg-purple-500`}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setDraft(null)} className={`${buttonClass} text-white/50 hover:text-white`}>Cancel</button>
            </div>
            {error && <p className="text-[11px] text-red-300">{error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  const t = lineTotals({ ...item, sold });
  const perPiece = item.sell_price - item.buy_price;

  return (
    <tr className="align-middle">
      <td className={TD}>
        <span className="block font-bold text-white">{item.name}</span>
        {product ? (
          <Link href={`/admin/products?edit=${encodeURIComponent(product.id)}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200">
            <span className="material-symbols-outlined text-[12px]">link</span>
            {product.code ? `${product.code} · ` : ""}
            {product.name}
          </Link>
        ) : (
          <button type="button" onClick={() => setDraft(itemFrom(item))} className="text-[10px] font-bold text-white/30 hover:text-white/60">
            + Link to a product
          </button>
        )}
        {error && <span className="block text-[10px] text-red-300">{error}</span>}
      </td>
      <td className={`${TD} text-right`}>{formatKes(item.buy_price)}</td>
      <td className={`${TD} text-right`}>{formatKes(item.sell_price)}</td>
      <td className={`${TD} text-right font-bold`}><Signed value={perPiece} /></td>
      <td className={`${TD} text-right`}>{item.quantity}</td>
      <td className={`${TD} text-right`}>{formatKes(t.invested)}</td>
      <td className={TD}>
        <div className="flex items-center justify-center gap-1">
          <button type="button" onClick={() => step(-1)} disabled={sold <= 0} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30" aria-label={`One fewer ${item.name} sold`}>
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <span className={`min-w-[44px] text-center text-xs font-black ${sold >= item.quantity ? "text-green-400" : "text-white"}`} aria-live="polite">
            {sold}/{item.quantity}
          </span>
          <button type="button" onClick={() => step(1)} disabled={sold >= item.quantity} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30" aria-label={`One more ${item.name} sold`}>
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
      </td>
      <td className={`${TD} text-right`}>{formatKes(t.revenue)}</td>
      <td className={`${TD} text-right font-bold`}><Signed value={t.profit} /></td>
      <td className={`${TD} text-right`}><Signed value={t.expectedProfit} /></td>
      <td className={`${TD} text-right`}>
        <div className="flex justify-end gap-0.5">
          <button type="button" onClick={() => setDraft(itemFrom({ ...item, sold }))} disabled={busy} className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white" aria-label={`Edit ${item.name}`} title="Edit">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await confirm({ title: `Remove "${item.name}"?`, message: "This removes the item and its numbers from this inventory.", confirmLabel: "Remove item", tone: "danger" });
              if (ok) run(() => deleteInventoryItem(item.id));
            }}
            className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
            aria-label={`Remove ${item.name}`}
            title="Remove"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
