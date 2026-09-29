"use client";

import { useEffect, useRef, useState } from "react";
import { DATE_RANGE_PRESETS, dateRangeLabel, kenyaToday, type DateRange } from "@/lib/date-range";

/** A "date" dropdown: quick presets plus a custom start/end date range. */
export default function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value.preset === "custom");
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");
  const boxRef = useRef<HTMLDivElement>(null);
  const today = kenyaToday();
  const active = value.preset !== "all";

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setCustom(value.preset === "custom");
      setFrom(value.from ?? "");
      setTo(value.to ?? "");
    }
    setOpen(!open);
  }

  function pick(range: DateRange) {
    onChange(range);
    setOpen(false);
  }

  const invalid = from !== "" && to !== "" && from > to;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-full min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
          active
            ? "border-purple-400/40 bg-purple-600/20 text-purple-100"
            : "border-white/10 bg-zinc-900 text-white/60 hover:text-white"
        }`}
      >
        <span className="material-symbols-outlined text-sm">calendar_month</span>
        <span className="max-w-[220px] truncate normal-case tracking-normal text-xs font-bold">{dateRangeLabel(value)}</span>
        <span className="material-symbols-outlined text-sm">{open ? "expand_less" : "expand_more"}</span>
      </button>

      {active && !open && (
        <button
          type="button"
          onClick={() => onChange({ preset: "all" })}
          aria-label="Clear date filter"
          title="Clear date filter"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-white/60 hover:text-white"
        >
          <span className="material-symbols-outlined text-[13px]">close</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Filter by date"
          className="absolute left-0 top-[calc(100%+6px)] z-40 w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl"
        >
          <ul className="p-1.5">
            {DATE_RANGE_PRESETS.map((preset) => {
              const selected = !custom && value.preset === preset.value;
              return (
                <li key={preset.value}>
                  <button
                    type="button"
                    onClick={() => pick({ preset: preset.value })}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition ${
                      selected ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {preset.label}
                    {selected && <span className="material-symbols-outlined text-sm">check</span>}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition ${
                  custom ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                Custom range…
                <span className="material-symbols-outlined text-sm">date_range</span>
              </button>
            </li>
          </ul>

          {custom && (
            <form
              className="space-y-3 border-t border-white/5 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (invalid || (!from && !to)) return;
                pick({ preset: "custom", from: from || undefined, to: to || undefined });
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[9px] font-black uppercase tracking-widest text-white/40">
                  Start date
                  <input
                    type="date"
                    value={from}
                    max={to || today}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white [color-scheme:dark] focus:border-purple-400 focus:outline-none"
                  />
                </label>
                <label className="grid gap-1 text-[9px] font-black uppercase tracking-widest text-white/40">
                  End date
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    max={today}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-white [color-scheme:dark] focus:border-purple-400 focus:outline-none"
                  />
                </label>
              </div>
              {invalid && <p className="text-[11px] text-red-300">The start date must be on or before the end date.</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invalid || (!from && !to)}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
