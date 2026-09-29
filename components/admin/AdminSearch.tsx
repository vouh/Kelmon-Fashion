"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit, SearchKind } from "@/app/admin/search-actions";

/**
 * The admin search: type straight into the topbar box and results drop down
 * underneath it (on phones, a panel under the topbar). Pages match instantly on
 * the client; orders, products, accounts and the rest come from
 * /api/admin/search as you type. Ctrl/Cmd+K focuses it, arrows move, Enter
 * opens, Escape clears then closes.
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

/**
 * How long one attempt may take. Generous on purpose: a cold dev server can
 * spend several seconds compiling the route, and a timed-out attempt is
 * retried once quietly before the box shows an error.
 */
const SEARCH_TIMEOUT_MS = 20_000;
const DEBOUNCE_MS = 200;

type SearchState =
  | { status: "idle" }
  | { status: "loading"; term: string }
  | { status: "done"; term: string; hits: SearchHit[] }
  | { status: "error"; term: string; message: string };

/**
 * Runs the search as a normal request: every keystroke cancels the previous
 * one, each request times out after SEARCH_TIMEOUT_MS, and answers are cached
 * per term. So the box always settles on results, "nothing found" or an
 * error with a retry — it can't sit on "Searching…" forever.
 */
function useAdminSearch(superAdmin: boolean) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [retryTick, setRetryTick] = useState(0);
  const cache = useRef(new Map<string, SearchHit[]>());

  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) {
      setState({ status: "idle" });
      return;
    }
    const cached = cache.current.get(term.toLowerCase());
    if (cached) {
      setState({ status: "done", term, hits: cached });
      return;
    }

    setState({ status: "loading", term });
    let cancelled = false;
    let controller: AbortController | null = null;

    async function attempt(): Promise<SearchHit[]> {
      controller = new AbortController();
      const timer = setTimeout(() => controller?.abort("timeout"), SEARCH_TIMEOUT_MS);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as { hits?: SearchHit[] };
        if (!res.ok) throw new Error(res.status === 401 ? "Your session expired — refresh the page." : "Search failed.");
        return data.hits ?? [];
      } finally {
        clearTimeout(timer);
      }
    }

    const debounce = setTimeout(async () => {
      try {
        let hits: SearchHit[];
        try {
          hits = await attempt();
        } catch (first) {
          if (cancelled) return;
          // One quiet retry for timeouts and dropped connections; real errors show at once.
          if (first instanceof Error && first.message.startsWith("Your session")) throw first;
          hits = await attempt();
        }
        if (cancelled) return;
        cache.current.set(term.toLowerCase(), hits);
        setState({ status: "done", term, hits });
      } catch (err) {
        if (cancelled) return;
        const timedOut = (controller as AbortController | null)?.signal.reason === "timeout";
        setState({
          status: "error",
          term,
          message: timedOut
            ? "Search is taking too long. Check your connection and retry."
            : err instanceof Error && err.message !== "Failed to fetch"
              ? err.message
              : "Couldn't reach the server.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      (controller as AbortController | null)?.abort("cancelled");
    };
  }, [term, retryTick]);

  /** Compiles and warms the search route the moment the box is opened, before the first keystroke. */
  const warmed = useRef(false);
  const warmUp = () => {
    if (warmed.current) return;
    warmed.current = true;
    fetch("/api/admin/search?q=", { cache: "no-store" }).catch(() => {
      warmed.current = false;
    });
  };

  const retry = () => {
    cache.current.delete(term.toLowerCase());
    setRetryTick((n) => n + 1);
  };

  const items = useMemo<Item[]>(() => {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const pages = PAGES.filter((p) => !p.superAdminOnly || superAdmin)
      .filter((p) => {
        const haystack = `${p.title} ${p.keywords}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      })
      .slice(0, term ? 6 : PAGES.length)
      .map<Item>((p) => ({ kind: "page", key: `page-${p.href}`, title: p.title, subtitle: p.href, href: p.href, icon: p.icon }));

    const hits = state.status === "done" && state.term === term ? state.hits : [];
    return [
      ...pages,
      ...hits.map<Item>((h) => ({ ...h, key: `${h.kind}-${h.id}`, icon: KIND_META[h.kind].icon })),
    ];
  }, [term, state, superAdmin]);

  const loading = state.status === "loading" && state.term === term;
  const error = state.status === "error" && state.term === term ? state.message : null;
  return { query, setQuery, term, items, loading, error, retry, warmUp };
}

function Results({
  listId,
  items,
  active,
  loading,
  error,
  onRetry,
  term,
  onHover,
  onChoose,
}: {
  listId: string;
  items: Item[];
  active: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  term: string;
  onHover: (index: number) => void;
  onChoose: (item: Item) => void;
}) {
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [listId, active]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 md:px-4">
      {term === "" && (
        <p className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-widest text-[var(--kelmon-text-secondary)]">
          Jump to a page · or type to search orders, products, people…
        </p>
      )}
      <ul id={listId} role="listbox" aria-label="Search results" className="grid gap-0.5">
        {items.map((item, index) => {
          const header = index === 0 || items[index - 1].kind !== item.kind;
          return (
            <li key={item.key} role="presentation">
              {header && term !== "" && (
                <p className="px-3 pb-1.5 pt-4 text-[10px] font-black uppercase tracking-widest text-[var(--kelmon-text-secondary)]">
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
                className={`flex cursor-pointer items-center gap-3.5 rounded-xl px-3 py-2.5 transition-colors ${
                  index === active ? "bg-[var(--kelmon-purple-muted)]" : "hover:bg-[var(--kelmon-purple-muted)]/60"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--kelmon-purple-muted)]">
                  <span className="material-symbols-outlined text-lg text-primary">{item.icon}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[var(--kelmon-text-primary)]">{item.title}</span>
                  <span className="block truncate text-xs text-[var(--kelmon-text-secondary)]">{item.subtitle}</span>
                </span>
                {index === active && (
                  <span className="material-symbols-outlined text-lg text-[var(--kelmon-text-secondary)]">keyboard_return</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {loading && (
        <p className="flex items-center gap-2 px-3 py-3 text-xs text-[var(--kelmon-text-secondary)]" role="status">
          <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
          Searching orders, products and people…
        </p>
      )}
      {error && (
        <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3" role="alert">
          <p className="flex items-center gap-2 text-xs text-red-300">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-200 hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && term.length >= 2 && items.length === 0 && (
        <div className="px-3 py-14 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--kelmon-text-secondary)]">search_off</span>
          <p className="mt-2 text-sm text-[var(--kelmon-text-secondary)]">Nothing matches &ldquo;{term}&rdquo;.</p>
        </div>
      )}
      {term.length === 1 && (
        <p className="px-3 py-3 text-xs text-[var(--kelmon-text-secondary)]">Keep typing to search orders, products and people…</p>
      )}
    </div>
  );
}

export default function AdminSearch({ superAdmin, variant = "bar" }: { superAdmin: boolean; variant?: "bar" | "mobile" }) {
  const router = useRouter();
  const listId = useId();
  const { query, setQuery, term, items, loading, error, retry, warmUp } = useAdminSearch(superAdmin);
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
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  // Clicking anywhere outside the box and its dropdown closes it.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (variant === "mobile" && open) inputRef.current?.focus();
  }, [variant, open]);

  function openBox() {
    setOpen(true);
    warmUp();
  }

  function close() {
    setOpen(false);
    setActive(0);
    inputRef.current?.blur();
  }

  function choose(item: Item) {
    close();
    setQuery("");
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
      else close();
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
      onFocus={openBox}
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
    />
  );

  const clearButton = query ? (
    <button
      type="button"
      onClick={() => {
        setQuery("");
        setActive(0);
        inputRef.current?.focus();
      }}
      aria-label="Clear search"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-[var(--kelmon-purple-muted)]"
    >
      <span className="material-symbols-outlined text-base">close</span>
    </button>
  ) : null;

  const results = (
    <Results
      listId={listId}
      items={items}
      active={active}
      loading={loading}
      error={error}
      onRetry={retry}
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
          onClick={openBox}
          aria-label="Search the admin dashboard"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:text-white"
        >
          <span className="material-symbols-outlined text-lg">search</span>
        </button>
        {open && (
          <div className="fixed inset-x-0 bottom-0 top-11 z-[60] bg-black/60 backdrop-blur-sm">
            <div
              ref={boxRef}
              className="flex max-h-full flex-col overflow-hidden border-b border-[var(--kelmon-border-default)] bg-[var(--kelmon-bg-elevated)] shadow-2xl"
            >
              <div className="p-3">
                <label className="admin-command-search !w-full">
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  {input}
                  {clearButton}
                  <button type="button" onClick={close} className="shrink-0 text-xs font-bold">
                    Cancel
                  </button>
                </label>
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
        {clearButton ?? <kbd>Ctrl K</kbd>}
      </label>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 flex max-h-[min(72vh,560px)] w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--kelmon-border-default)] bg-[var(--kelmon-bg-elevated)] shadow-2xl">
          {results}
          <div className="flex items-center gap-4 border-t border-[var(--kelmon-border-default)] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--kelmon-text-secondary)]">
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-[var(--kelmon-border-default)] px-1.5">↑↓</kbd> Move</span>
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-[var(--kelmon-border-default)] px-1.5">Enter</kbd> Open</span>
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-[var(--kelmon-border-default)] px-1.5">Esc</kbd> Close</span>
          </div>
        </div>
      )}
    </div>
  );
}
