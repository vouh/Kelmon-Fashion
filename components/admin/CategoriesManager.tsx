"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/admin/ui";
import {
  createCategory,
  deleteCategory,
  moveCategory,
  setCategoryInFilter,
  type ActionResult,
} from "@/app/admin/actions";
import type { CategoryRow } from "@/lib/supabase/types";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";

interface CategoriesManagerProps {
  categories: CategoryRow[];
  productCounts: Record<string, number>;
}

export default function CategoriesManager({ categories, productCounts }: CategoriesManagerProps) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [showInFilter, setShowInFilter] = useState(true);

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    run(
      () => createCategory(name, showInFilter),
      () => setName("")
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/5 bg-zinc-900 p-4">
        <h3 className="text-xs font-black text-white">Add a category</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. Shoes"
            className={`${inputClass} sm:flex-1`}
          />
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-[11px] font-bold text-white/60">
            <input
              type="checkbox"
              checked={showInFilter}
              onChange={(e) => setShowInFilter(e.target.checked)}
              className="h-4 w-4 accent-purple-500"
            />
            Show as shop filter
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add"}
          </button>
        </div>
      </form>

      <p className="px-1 text-[11px] leading-relaxed text-white/40">
        Categories switched on appear as filter buttons on the shop page, in this order, after
        &ldquo;All&rdquo;. Keep it to a few so the row stays tidy. Products in hidden categories
        still show under &ldquo;All&rdquo;.
      </p>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900">
        {categories.length === 0 ? (
          <EmptyState icon="category" message="No categories yet" />
        ) : (
          <ul className="divide-y divide-white/5">
            {categories.map((category, index) => {
              const count = productCounts[category.name] ?? 0;
              return (
                <li key={category.name} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => run(() => moveCategory(category.name, "up"))}
                      className="rounded text-white/40 hover:text-white disabled:opacity-20"
                      aria-label={`Move ${category.name} up`}
                    >
                      <span className="material-symbols-outlined text-base leading-none">keyboard_arrow_up</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === categories.length - 1}
                      onClick={() => run(() => moveCategory(category.name, "down"))}
                      className="rounded text-white/40 hover:text-white disabled:opacity-20"
                      aria-label={`Move ${category.name} down`}
                    >
                      <span className="material-symbols-outlined text-base leading-none">keyboard_arrow_down</span>
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white">{category.name}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      {count} product{count === 1 ? "" : "s"}
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
                    <span className="hidden sm:inline">Shop filter</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={category.show_in_filter}
                      aria-label={`Show ${category.name} as a shop filter`}
                      disabled={busy}
                      onClick={() => run(() => setCategoryInFilter(category.name, !category.show_in_filter))}
                      className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                        category.show_in_filter ? "bg-purple-500" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          category.show_in_filter ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Delete the "${category.name}" category?`)) {
                        run(() => deleteCategory(category.name));
                      }
                    }}
                    className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    aria-label={`Delete ${category.name}`}
                  >
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
