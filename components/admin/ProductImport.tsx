"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importProducts, type ImportRowResult } from "@/app/admin/actions";
import { productImportRowSchema } from "@/lib/validation/schemas";

/**
 * Import products from a CSV or Excel (.xlsx) file.
 *
 * The file is read in the browser and previewed, row by row, before anything
 * is saved; the server checks every row again. Imported products arrive
 * unpublished and without photos — add photos, then publish.
 */

type Field = "name" | "price" | "quantity" | "category" | "for" | "description" | "wasPrice" | "sizes" | "colors";

const FIELDS: { key: Field; header: string; required: boolean; help: string; example: string }[] = [
  { key: "name", header: "name", required: true, help: "Product name as customers see it.", example: "Chanel No.5 Mini" },
  { key: "price", header: "price", required: true, help: "Selling price in KES, numbers only.", example: "2500" },
  { key: "quantity", header: "quantity", required: true, help: "How many are in stock (0 or more).", example: "10" },
  { key: "category", header: "category", required: true, help: "Must match one of your categories.", example: "Perfumes" },
  { key: "for", header: "for", required: false, help: "Men, Ladies or Unisex. Blank = Unisex.", example: "Ladies" },
  { key: "description", header: "description", required: false, help: "A sentence or two about it.", example: "Classic floral scent, 30ml" },
  { key: "wasPrice", header: "was price", required: false, help: "Old price, to show it's on sale. Higher than price.", example: "3000" },
  { key: "sizes", header: "sizes", required: false, help: "Separate with commas, e.g. S, M, L.", example: "" },
  { key: "colors", header: "colors", required: false, help: "Separate with commas, e.g. Black, Brown.", example: "" },
];

/** Header spellings people actually use, all mapped to one field. */
const ALIASES: Record<string, Field> = {
  name: "name", product: "name", productname: "name", item: "name", itemname: "name", title: "name",
  price: "price", pricekes: "price", kes: "price", sellingprice: "price", amount: "price", cost: "price",
  quantity: "quantity", qty: "quantity", stock: "quantity", quantityinstock: "quantity", units: "quantity", instock: "quantity",
  category: "category", type: "category", categories: "category",
  for: "for", gender: "for", who: "for", whoisitfor: "for", sex: "for", audience: "for",
  description: "description", desc: "description", details: "description", about: "description",
  wasprice: "wasPrice", was: "wasPrice", originalprice: "wasPrice", oldprice: "wasPrice", beforeprice: "wasPrice",
  sizes: "sizes", size: "sizes",
  colors: "colors", colours: "colors", color: "colors", colour: "colors",
};

const normalize = (header: string) => header.toLowerCase().replace(/[^a-z]/g, "");

type ParsedRow = { row: number; values: Record<string, string>; error: string | null };

function toRecords(table: unknown[][]): { rows: Record<string, string>[]; unknown: string[]; missing: string[] } {
  const [headerRow = [], ...body] = table;
  const headers = headerRow.map((h) => String(h ?? "").trim());
  const mapped = headers.map((h) => ALIASES[normalize(h)] ?? null);
  const unknown = headers.filter((h, i) => h && !mapped[i]);
  const missing = FIELDS.filter((f) => f.required && !mapped.includes(f.key)).map((f) => f.header);

  const rows = body
    .filter((cells) => cells.some((c) => String(c ?? "").trim() !== ""))
    .map((cells) => {
      const record: Record<string, string> = {};
      mapped.forEach((field, i) => {
        if (field) record[field] = String(cells[i] ?? "").trim();
      });
      return record;
    });
  return { rows, unknown, missing };
}

export default function ProductImport({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const categorySet = new Set(categories.map((c) => c.trim().toLowerCase()));

  function reset() {
    setFileName(null);
    setParsed(null);
    setNotice(null);
    setError(null);
    setResults(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    setOpen(false);
    reset();
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  function downloadTemplate() {
    const cats = categories.length ? categories : ["Perfumes", "Bags"];
    const example = (cat: string, i: number) =>
      [
        [`Example ${cat.toLowerCase()} item ${i + 1}`, "2500", "10", cat, i % 2 ? "Men" : "Ladies", "Short description", "", "", ""],
      ][0];
    const lines = [
      FIELDS.map((f) => f.header),
      ...cats.slice(0, 3).map((c, i) => example(c, i)),
    ]
      .map((cells) => cells.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
      .join("\r\n");
    // BOM so Excel opens it as UTF-8.
    const blob = new Blob(["﻿" + lines + "\r\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kelmon-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | undefined) {
    reset();
    if (!file) return;
    setFileName(file.name);
    try {
      let table: unknown[][];
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        table = (await readSheet(file)) as unknown[][];
      } else if (/\.(csv|txt)$/i.test(file.name)) {
        const Papa = (await import("papaparse")).default;
        const text = await file.text();
        table = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true }).data;
      } else if (/\.xls$/i.test(file.name)) {
        setError("Old .xls files aren't supported — in Excel choose File → Save As → Excel Workbook (.xlsx) or CSV.");
        return;
      } else {
        setError("Choose a .csv or .xlsx file.");
        return;
      }

      const { rows, unknown, missing } = toRecords(table);
      if (missing.length) {
        setError(`The file is missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Download the template to see the layout.`);
        return;
      }
      if (rows.length === 0) {
        setError("No product rows found under the header row.");
        return;
      }
      if (rows.length > 500) {
        setError(`That's ${rows.length} products — import at most 500 at a time.`);
        return;
      }
      if (unknown.length) setNotice(`Ignored column${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`);

      setParsed(
        rows.map((values, i) => {
          const check = productImportRowSchema.safeParse(values);
          let problem = check.success ? null : check.error.issues[0]?.message ?? "Invalid row.";
          if (!problem && !categorySet.has(values.category.trim().toLowerCase())) {
            problem = `Unknown category "${values.category}".`;
          }
          return { row: i + 2, values, error: problem };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? `Couldn't read that file: ${err.message}` : "Couldn't read that file.");
    }
  }

  const good = parsed?.filter((r) => !r.error) ?? [];
  const bad = parsed?.filter((r) => r.error) ?? [];

  function runImport() {
    if (!good.length) return;
    setError(null);
    startTransition(async () => {
      const response = await importProducts(good.map((r) => r.values));
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResults(response.results);
      setParsed(null);
      router.refresh();
    });
  }

  const created = results?.filter((r) => r.ok) ?? [];
  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/70 transition hover:border-purple-400/40 hover:text-white"
      >
        <span className="material-symbols-outlined text-sm">upload_file</span> Import CSV / Excel
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 backdrop-blur-sm animate-[confirm-fade_0.15s_ease-out] sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-900 shadow-2xl animate-[confirm-pop_0.18s_cubic-bezier(0.22,1,0.36,1)] sm:max-w-3xl sm:rounded-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-200">
                <span className="material-symbols-outlined text-xl">upload_file</span>
              </span>
              <div className="flex-1">
                <h2 id="import-title" className="text-sm font-black text-white">Import products</h2>
                <p className="text-[11px] text-white/40">CSV or Excel (.xlsx) · up to 500 at a time</p>
              </div>
              <button type="button" onClick={close} disabled={busy} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Close">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {!parsed && !results && (
                <>
                  <div className="rounded-xl border border-purple-400/20 bg-purple-500/5 px-4 py-3 text-[11px] leading-relaxed text-white/60">
                    Put one product per row, with these column headings in the first row. Imported products
                    are saved <strong className="text-white/80">unpublished and without photos</strong> — then
                    open each one to add photos and publish it. Each gets its product code (e.g. P002) straight away.
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">Column</th>
                          <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">What to put</th>
                          <th className="hidden px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30 sm:table-cell">Example</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {FIELDS.map((f) => (
                          <tr key={f.key}>
                            <td className="whitespace-nowrap px-3 py-2 font-mono font-bold text-white">
                              {f.header}
                              {f.required ? (
                                <span className="ml-1.5 rounded bg-red-400/15 px-1 py-0.5 text-[8px] font-black uppercase text-red-300">required</span>
                              ) : (
                                <span className="ml-1.5 text-[9px] text-white/30">optional</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-white/60">
                              {f.help}
                              {f.key === "category" && categories.length > 0 && (
                                <span className="mt-0.5 block text-[10px] text-white/40">Yours: {categories.join(", ")}</span>
                              )}
                            </td>
                            <td className="hidden px-3 py-2 text-white/40 sm:table-cell">{f.example || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-white/35">
                    Headings aren&apos;t fussy: “Qty” or “Stock” work for quantity, “Colours” for colors, “Gender” for for.
                    Photos can&apos;t go in a spreadsheet — add them after importing.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white/70 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-sm">download</span> Download template
                    </button>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-purple-500">
                      <span className="material-symbols-outlined text-sm">folder_open</span> Choose file
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => void onFile(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-300" role="alert">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{error}</span>
                </div>
              )}
              {notice && !error && <p className="text-[11px] text-amber-300/80">{notice}</p>}

              {parsed && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-white">{fileName}</span>
                    <span className="rounded-full bg-green-400/15 px-2 py-0.5 font-bold text-green-300">{good.length} ready</span>
                    {bad.length > 0 && (
                      <span className="rounded-full bg-red-400/15 px-2 py-0.5 font-bold text-red-300">{bad.length} with problems (skipped)</span>
                    )}
                  </div>
                  <div className="max-h-[42vh] overflow-auto rounded-xl border border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-zinc-800">
                        <tr>
                          {["Row", "Name", "Price", "Qty", "Category", "For", ""].map((h) => (
                            <th key={h} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsed.map((r) => (
                          <tr key={r.row} className={r.error ? "bg-red-500/[0.06]" : ""}>
                            <td className="px-3 py-2 text-white/30">{r.row}</td>
                            <td className="max-w-[180px] truncate px-3 py-2 font-bold text-white">{r.values.name || "—"}</td>
                            <td className="px-3 py-2 text-white/70">{r.values.price}</td>
                            <td className="px-3 py-2 text-white/70">{r.values.quantity}</td>
                            <td className="px-3 py-2 text-white/70">{r.values.category}</td>
                            <td className="px-3 py-2 text-white/70">{r.values.for || "Unisex"}</td>
                            <td className="px-3 py-2">
                              {r.error ? (
                                <span className="text-[11px] text-red-300">{r.error}</span>
                              ) : (
                                <span className="material-symbols-outlined text-base text-green-400">check_circle</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={runImport}
                      disabled={busy || good.length === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-purple-500 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">publish</span>
                      {busy ? "Importing…" : `Import ${good.length} product${good.length === 1 ? "" : "s"}`}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      disabled={busy}
                      className="rounded-lg border border-white/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white"
                    >
                      Choose another file
                    </button>
                  </div>
                </>
              )}

              {results && (
                <>
                  <div className="rounded-xl border border-green-400/25 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                    <strong>{created.length}</strong> product{created.length === 1 ? "" : "s"} imported as drafts
                    {failed.length > 0 && <span className="text-red-300"> · {failed.length} skipped</span>}. Add photos,
                    then press <strong>Publish</strong> on each one to show it in the shop.
                  </div>
                  <ul className="divide-y divide-white/5 rounded-xl border border-white/5 text-xs">
                    {results.map((r) => (
                      <li key={r.row} className="flex items-center gap-3 px-3 py-2">
                        <span className="w-10 text-white/30">#{r.row}</span>
                        <span className="min-w-0 flex-1 truncate text-white/80">{r.name || "—"}</span>
                        {r.ok ? (
                          <span className="rounded bg-purple-400/15 px-1.5 py-0.5 font-mono font-black text-purple-200">
                            {r.code ?? "no code"}
                          </span>
                        ) : (
                          <span className="text-right text-[11px] text-red-300">{r.error}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg bg-purple-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-purple-500"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
