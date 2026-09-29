"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, Panel, TD, TH } from "@/components/admin/ui";
import { createCodeLetter } from "@/app/admin/actions";
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

  const [name, setName] = useState("");
  const [letter, setLetter] = useState("");
  const [category, setCategory] = useState("");
  /** Typing a brand-new category instead of picking an existing one. */
  const [creating, setCreating] = useState(openCategories.length === 0);
  const categoryTaken = coveredCategories.has(category.trim().toLowerCase());

  function suggestLetter(text: string) {
    const first = text.trim()[0]?.toUpperCase();
    return first && freeLetters.includes(first) ? first : "";
  }

  /** The name and letter follow the category until the admin types a name of their own. */
  function chooseCategory(value: string) {
    const following = !name.trim() || name.trim().toLowerCase() === category.trim().toLowerCase();
    setCategory(value);
    if (following) {
      setName(value);
      setLetter(suggestLetter(value));
    }
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
      () => createCodeLetter({ letter, name, category }),
      () => {
        setName("");
        setLetter("");
        setCategory("");
        setCreating(false);
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 px-4 py-3 text-[11px] leading-relaxed text-white/60">
        Every product gets a permanent code from its category&apos;s letter: the first perfume is{" "}
        <span className="font-mono font-bold text-purple-200">P001</span>, the next{" "}
        <span className="font-mono font-bold text-purple-200">P002</span>, and so on. A code never
        changes — not when stock runs out, is topped up, or the product is renamed. Order numbers
        carry it too, e.g.{" "}
        <span className="font-mono font-bold text-purple-200">P001-20260930-01</span> (product,
        date, that day&apos;s order number). The counters only move when a product is added, and a
        letter with no products left starts again from 001. Letters are locked once added.
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
                  <th className={TH}>Name</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Reached</th>
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
                    <td className={`${TD} font-bold text-white`}>{p.name}</td>
                    <td className={TD}>{p.category}</td>
                    <td className={`${TD} font-mono`}>
                      {p.reached ?? <span className="text-white/25">not used yet</span>}
                    </td>
                    <td className={TD}>{p.productCount}</td>
                    <td className={`${TD} text-right`}>
                      <span
                        className="material-symbols-outlined text-base text-white/20"
                        title="Locked — letters are permanent so codes stay correct"
                        aria-label={`Letter ${p.letter} is locked`}
                      >
                        lock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <form onSubmit={add} className="space-y-3 rounded-xl border border-white/5 bg-zinc-900 p-4">
        <h3 className="text-xs font-black text-white">Add a category letter</h3>
        <>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
              <div>
                <label className={labelClass} htmlFor="code-letter-name">Name</label>
                <input
                  id="code-letter-name"
                  required
                  value={name}
                  maxLength={60}
                  onChange={(e) => {
                    setName(e.target.value);
                    setLetter(suggestLetter(e.target.value));
                  }}
                  placeholder="e.g. Bags"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`${labelClass} flex items-center justify-between`}>
                  Category
                  {openCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreating((v) => !v);
                        setCategory("");
                        setLetter("");
                      }}
                      className="normal-case tracking-normal font-bold text-purple-300 hover:text-purple-200"
                    >
                      {creating ? "Pick an existing one" : "+ New category"}
                    </button>
                  )}
                </label>
                {creating ? (
                  <input
                    required
                    value={category}
                    maxLength={60}
                    onChange={(e) => chooseCategory(e.target.value)}
                    placeholder="New category, e.g. Keyholders"
                    className={inputClass}
                  />
                ) : (
                  <select
                    required
                    value={category}
                    onChange={(e) => chooseCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose…</option>
                    {openCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
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
                disabled={busy || !name.trim() || !letter || !category.trim() || categoryTaken}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {busy ? "Saving…" : creating ? "Add category" : "Add letter"}
              </button>
            </div>
            <p className="text-[10px] text-white/30">
              {categoryTaken
                ? `"${category.trim()}" already has a letter.`
                : letter && name.trim() && category.trim()
                  ? `${creating ? `Creates the "${category.trim()}" category (shown in the shop filters). ` : ""}${name.trim()} = ${letter}: the first ${category.trim()} product will be ${letter}001.`
                  : "Give it a name (e.g. Bags), a letter (B) and the category its products are in. The letter is suggested from the name; taken letters are hidden. A letter can't be removed or changed once added, so choose carefully."}
            </p>
        </>
      </form>
    </div>
  );
}
