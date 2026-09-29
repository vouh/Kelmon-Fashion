"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchAdmin, type SearchHit, type SearchKind } from "@/app/admin/search-actions";

/**
 * The admin topbar search. Pages match instantly on the client; orders,
 * products, accounts and the rest come from searchAdmin() as you type.
 * Ctrl/Cmd+K focuses it, arrows move, Enter opens, Escape closes.
 */

interface PageEntry {
  title: string;
  href: string;
  icon: string;
  keywords: string;
  superAdminOnly?: boolean;
}

const PAGES: PageEntry[] = [
  { title: "Overview", href: "/admin", icon: "dashboard", keywords: "home dashboard summary today" },
  { title: "All Orders", href: "/admin/orders", icon: "receipt_long", keywords: "orders sales deliveries customers" },
  { title: "New road sale", href: "/admin/orders?new=1", icon: "add_shopping_cart", keywords: "direct order walk in request payment stk" },
  { title: "Products", href: "/admin/products", icon: "inventory_2", keywords: "catalogue stock inventory items add product" },
  { title: "Product settings", href: "/admin/products/settings", icon: "tune", keywords: "code letters prefixes product codes" },
  { title: "Categories", href: "/admin/categories", icon: "category", keywords: "shop filters" },
  { title: "Statistics", href: "/admin/stats", icon: "bar_chart", keywords: "stats revenue charts analytics sales" },
  { title: "Manage Deals", href: "/admin/deals", icon: "local_offer", keywords: "discounts promo codes offers" },
  { title: "Homepage drops", href: "/admin/homepage-drops", icon: "auto_awesome", keywords: "just dropped circles new arrivals home" },
  { title: "Updates", href: "/admin/updates", icon: "campaign", keywords: "announcements news posts" },
  { title: "Reviews", href: "/admin/reviews", icon: "star", keywords: "ratings feedback comments" },
  { title: "Payments", href: "/admin/transactions", icon: "payments", keywords: "mpesa transactions receipts money" },
  { title: "Successful payments", href: "/admin/transactions?filter=success", icon: "check_circle", keywords: "paid mpesa receipts" },
  { title: "Failed payments", href: "/admin/transactions?filter=failed", icon: "cancel", keywords: "wrong pin timeout declined insufficient" },
  { title: "Notifications", href: "/admin/notifications", icon: "notifications", keywords: "alerts activity" },
  { title: "Communications", href: "/admin/communications", icon: "forum", keywords: "messages inbox contact email campaigns" },
  { title: "Settings", href: "/admin/settings", icon: "settings", keywords: "order alerts recipients email" },
  {
    title: "Accounts",
    href: "/admin/accounts",
    icon: "group",
    keywords: "users customers admins super admin roles invite team",
    superAdminOnly: true,
  },
];

const KIND_META: Record<SearchKind | "page", { label: string; icon: string }> = {
  page: { label: "Pages", icon: "article" },
  order: { label: "Orders", icon: "receipt_long" },
  product: { label: "Products", icon: "inventory_2" },
  account: { label: "Accounts", icon: "person" },
  category: { label: "Categories", icon: "category" },
  deal: { label: "Deals", icon: "local_offer" },
  update: { label: "Updates", icon: "campaign" },
  review: { label: "Reviews", icon: "star" },
  message: { label: "Messages", icon: "mail" },
  drop: { label: "Homepage drops", icon: "auto_awesome" },
};

type Item = { kind: SearchKind | "page"; key: string; title: string; subtitle: string; href: string; icon: string };

/**
 * Scrolls to the item a result points at (`page#hit-…`) and flashes it. Polls
 * because the target page may still be loading after router.push; the App
 * Router's pushState doesn't update :target, so CSS alone can't do this.
 */
function flashWhenReady(anchor: string) {
  let tries = 0;
  const timer = window.setInterval(() => {
    const element = document.getElementById(anchor);
    if (!element && ++tries < 100) return;
    window.clearInterval(timer);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.remove("admin-search-hit");
    void element.offsetWidth;
    element.classList.add("admin-search-hit");
    window.setTimeout(() => element.classList.remove("admin-search-hit"), 2600);
  }, 100);
}

function useAdminSearch(superAdmin: boolean) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ term: string; hits: SearchHit[] }>({ term: "", hits: [] });
  const latest = useRef("");

  const term = query.trim();

  useEffect(() => {
    latest.current = term;
    if (term.length < 2) return;
    const timer = setTimeout(() => {
      searchAdmin(term)
        .then((hits) => {
          if (latest.current === term) setResult({ term, hits });
        })
        .catch(() => {
          if (latest.current === term) setResult({ term, hits: [] });
        });
    }, 220);
    return () => clearTimeout(timer);
  }, [term]);

  const items = useMemo<Item[]>(() => {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const pages = PAGES.filter((p) => !p.superAdminOnly || superAdmin)
      .filter((p) => {
        const haystack = `${p.title} ${p.keywords}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      })
      .slice(0, term ? 6 : PAGES.length)
      .map<Item>((p) => ({ kind: "page", key: `page-${p.href}`, title: p.title, subtitle: p.href, href: p.href, icon: p.icon }));

    const hits = term.length >= 2 && result.term === term ? result.hits : [];
    return [
      ...pages,
      ...hits.map<Item>((h) => ({ ...h, key: `${h.kind}-${h.id}`, icon: KIND_META[h.kind].icon })),
    ];
  }, [term, result, superAdmin]);

  const loading = term.length >= 2 && result.term !== term;
  return { query, setQuery, term, items, loading };
}

function Results({
  listId,
  items,
  active,
  loading,
  term,
  onHover,
  onChoose,
}: {
  listId: string;
  items: Item[];
  active: number;
  loading: boolean;
  term: string;
  onHover: (index: number) => void;
  onChoose: (item: Item) => void;
}) {
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [listId, active]);

  return (
    <div className="max-h-[min(70vh,520px)] overflow-y-auto p-1.5">
      {term === "" && (
        <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-widest text-[var(--kelmon-text-secondary)]">
          Jump to · or type to search orders, products, people…
        </p>
      )}
      <ul id={listId} role="listbox" aria-label="Search results">
        {items.map((item, index) => {
          const header = index === 0 || items[index - 1].kind !== item.kind;
          return (
            <li key={item.key} role="presentation">
              {header && term !== "" && (
                <p className="px-3 pb-1 pt-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--kelmon-text-secondary)]">
                  {KIND_META[item.kind].label}
                </p>
              )}
              <div
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseMove={() => onHover(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChoose(item)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${
                  index === active ? "bg-[var(--kelmon-purple-muted)]" : ""
                }`}
              >
                <span className="material-symbols-outlined text-lg text-primary">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-[var(--kelmon-text-primary)]">{item.title}</span>
                  <span className="block truncate text-[11px] text-[var(--kelmon-text-secondary)]">{item.subtitle}</span>
                </span>
                {index === active && (
                  <span className="material-symbols-outlined text-base text-[var(--kelmon-text-secondary)]">keyboard_return</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {loading && (
        <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--kelmon-text-secondary)]">
          <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
          Searching…
        </p>
      )}
      {!loading && term.length >= 2 && items.length === 0 && (
        <p className="px-3 py-6 text-center text-xs text-[var(--kelmon-text-secondary)]">
          Nothing matches “{term}”.
        </p>
      )}
      {!loading && term.length === 1 && items.length === 0 && (
        <p className="px-3 py-6 text-center text-xs text-[var(--kelmon-text-secondary)]">Keep typing…</p>
      )}
    </div>
  );
}

export default function AdminSearch({ superAdmin, variant = "bar" }: { superAdmin: boolean; variant?: "bar" | "mobile" }) {
  const router = useRouter();
  const listId = useId();
  const { query, setQuery, term, items, loading } = useAdminSearch(superAdmin);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A search link opened fresh (new tab, refresh) still lands on its item.
    if (variant === "bar" && window.location.hash.startsWith("#hit-")) {
      flashWhenReady(window.location.hash.slice(1));
    }
  }, [variant]);

  useEffect(() => {
    if (variant !== "bar") return;
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  useEffect(() => {
    if (!open || variant !== "bar") return;
    function onPointer(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, variant]);

  function choose(item: Item) {
    setOpen(false);
    setQuery("");
    setActive(0);
    inputRef.current?.blur();
    router.push(item.href);
    const anchor = item.href.split("#")[1];
    if (anchor) flashWhenReady(anchor);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[active] ?? items[0];
      if (item) choose(item);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (query) setQuery("");
      else {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
  }

  const input = (
    <input
      ref={inputRef}
      value={query}
      onChange={(e) => {
        setQuery(e.target.value.slice(0, 80));
        setActive(0);
        setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={onKeyDown}
      role="combobox"
      aria-label="Search the admin dashboard"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
      placeholder="Search orders, products, people, pages…"
      autoComplete="off"
      spellCheck={false}
      maxLength={80}
      autoFocus={variant === "mobile"}
    />
  );

  const results = (
    <Results
      listId={listId}
      items={items}
      active={active}
      loading={loading}
      term={term}
      onHover={setActive}
      onChoose={choose}
    />
  );

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search the admin dashboard"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:text-white"
        >
          <span className="material-symbols-outlined text-lg">search</span>
        </button>
        {open && (
          <div className="fixed inset-0 z-[60] bg-black/60 p-3 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <div
              ref={boxRef}
              onClick={(e) => e.stopPropagation()}
              className="overflow-hidden rounded-2xl border border-[var(--kelmon-border-default)] bg-[var(--kelmon-bg-elevated)] shadow-2xl"
            >
              <div className="admin-command-search !w-full !rounded-none !border-0 !border-b">
                <span className="material-symbols-outlined text-[18px]">search</span>
                {input}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close search"
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              {results}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="admin-command-search">
        <span className="material-symbols-outlined text-[18px]">search</span>
        {input}
        <kbd>Ctrl K</kbd>
      </label>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(520px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--kelmon-border-default)] bg-[var(--kelmon-bg-elevated)] shadow-2xl">
          {results}
        </div>
      )}
    </div>
  );
}
