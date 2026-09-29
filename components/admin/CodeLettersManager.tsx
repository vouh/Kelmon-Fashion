"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, Panel, TD, TH } from "@/components/admin/ui";
import { createCodeLetter, deleteCodeLetter } from "@/app/admin/actions";
import type { CodePrefixSummary } from "@/lib/supabase/product-codes";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none";
const labelClass = "block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function CodeLettersManager({
  prefixes,
  categories,
}: {
  prefixes: CodePrefixSummary[];
  categories: string[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const usedLetters = new Set(prefixes.map((p) => p.letter));
  const coveredCategories = new Set(prefixes.map((p) => p.category.trim().toLowerCase()));
  const openCategories = categories.filter((c) => !coveredCategories.has(c.trim().toLowerCase()));
  const freeLetters = ALPHABET.filter((l) => !usedLetters.has(l));

  const [letter, setLetter] = useState("");
  const [category, setCategory] = useState("");

  function suggestLetter(name: string) {
    const first = name.trim()[0]?.toUpperCase();
    return first && freeLetters.includes(first) ? first : "";
  }

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

  function add(event: React.FormEvent) {
    event.preventDefault();
    run(
      () => createCodeLetter({ letter, category }),
      () => {
        setLetter("");
        setCategory("");
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 px-4 py-3 text-[11px] leading-relaxed text-white/60">
        Every product gets a permanent code from its category&apos;s letter: the first perfume is{" "}
        <span className="font-mono font-bold text-purple-200">P001</span>, the next{" "}
        <span className="font-mono font-bold text-purple-200">P002</span>, and so on. A code never
        changes — not when stock runs out, is topped up, or the product is renamed — and is never
        reused. Order numbers carry it too, e.g.{" "}
        <span className="font-mono font-bold text-purple-200">P001-20260930-01</span> (product,
        date, that day&apos;s order number). The counters below only move when a product is added,
        so they can&apos;t be edited here.
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <Panel title="Code letters" hint={`${prefixes.length} in use`}>
        {prefixes.length === 0 ? (
          <EmptyState icon="tag" message="No letters yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr>
                  <th className={TH}>Letter</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Reached</th>
                  <th className={TH}>Next code</th>
                  <th className={TH}>Products now</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {prefixes.map((p) => (
                  <tr key={p.letter} className="hover:bg-white/5">
                    <td className={TD}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 font-mono text-sm font-black text-purple-200">
                        {p.letter}
                      </span>
                    </td>
                    <td className={`${TD} font-bold text-white`}>{p.category}</td>
                    <td className={`${TD} font-mono`}>
                      {p.reached ?? <span className="text-white/25">not used yet</span>}
                    </td>
                    <td className={`${TD} font-mono text-white/50`}>
                      {p.letter + String(p.last_number + 1).padStart(3, "0")}
                    </td>
                    <td className={TD}>{p.productCount}</td>
                    <td className={`${TD} text-right`}>
                      {p.last_number === 0 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => deleteCodeLetter(p.letter))}
                          className="rounded p-1 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          aria-label={`Remove letter ${p.letter}`}
                          title="Remove (only possible before it's used)"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      ) : (
                        <span
                          className="material-symbols-outlined text-base text-white/20"
                          title="In use — locked so existing codes stay correct"
                        >
                          lock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <form onSubmit={add} className="space-y-3 rounded-xl border border-white/5 bg-zinc-900 p-4">
        <h3 className="text-xs font-black text-white">Add a letter for a category</h3>
        {openCategories.length === 0 ? (
          <p className="text-[11px] text-white/45">
            Every category already has a letter. Add a new category in{" "}
            <a href="/admin/categories" className="text-purple-300 underline underline-offset-2">
              Categories
            </a>{" "}
            first, then give it a letter here.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
              <div>
                <label className={labelClass}>Category</label>
                <select
                  required
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (!letter) setLetter(suggestLetter(e.target.value));
                  }}
                  className={inputClass}
                >
                  <option value="">Choose…</option>
                  {openCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Letter</label>
                <select
                  required
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  className={`${inputClass} font-mono`}
                >
                  <option value="">—</option>
                  {freeLetters.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={busy || !letter || !category}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Add letter"}
              </button>
            </div>
            <p className="text-[10px] text-white/30">
              {letter && category
                ? `The first ${category} product will be ${letter}001. Any ${category} products you already have get codes straight away, oldest first.`
                : "Letters already taken are hidden. Once a letter is used it's locked to its category."}
            </p>
          </>
        )}
      </form>
    </div>
  );
}
