"use client";

import { useId, useState } from "react";

/**
 * Single-series bar chart, inline SVG — replaces the Chart.js CDN script the old
 * admin/stats.html pulled in.
 *
 * One series per chart by design: orders and revenue are different scales, so
 * they get two charts rather than one dual-axis chart.
 *
 * Series color #a855f7 sits inside the dark lightness band (OKLCH L 0.58) and
 * clears 3:1 on the zinc-900 surface. A single series needs no legend — the
 * title names it.
 */

export interface BarDatum {
  label: string;
  value: number;
}

const SERIES = "#a855f7";

/**
 * A format *mode* rather than a formatter function: this is a Client Component,
 * and functions can't cross the server/client boundary as props.
 */
export type ValueFormat = "number" | "kes";

function format(value: number, mode: ValueFormat): string {
  return mode === "kes"
    ? `KES ${value.toLocaleString("en-KE")}`
    : value.toLocaleString("en-KE");
}

export default function BarChart({
  title,
  data,
  valueFormat = "number",
  height = 160,
}: {
  title: string;
  data: BarDatum[];
  valueFormat?: ValueFormat;
  height?: number;
}) {
  const id = useId();
  const formatValue = (value: number) => format(value, valueFormat);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(...data.map((d) => d.value), 0);
  const peak = data.reduce(
    (best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best),
    0
  );

  // Geometry in user units; the SVG scales to its container.
  const plotHeight = height - 28; // leave room for the x labels
  const barWidth = 100 / data.length;
  const gap = 1.2; // ~2px surface gap between adjacent bars at typical widths

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-black text-white">{title}</h3>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-[9px] font-black uppercase tracking-widest text-white/30 transition-colors hover:text-purple-300"
          aria-expanded={showTable}
        >
          {showTable ? "Chart" : "Table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th className="py-1 text-[9px] font-black uppercase tracking-widest text-white/30">
                Day
              </th>
              <th className="py-1 text-right text-[9px] font-black uppercase tracking-widest text-white/30">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((d) => (
              <tr key={d.label}>
                <td className="py-1.5 text-white/60">{d.label}</td>
                <td className="py-1.5 text-right font-bold text-white">
                  {formatValue(d.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height }}
            role="img"
            aria-label={`${title}. ${data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(", ")}`}
          >
            {/* Recessive baseline */}
            <line
              x1="0"
              y1={plotHeight}
              x2="100"
              y2={plotHeight}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />

            {data.map((d, i) => {
              const barHeight = max > 0 ? (d.value / max) * (plotHeight - 8) : 0;
              const x = i * barWidth + gap / 2;
              const w = barWidth - gap;
              const y = plotHeight - barHeight;
              const active = hover === i;

              return (
                <g key={`${id}-${d.label}`}>
                  {/* Hit target spans the full column height, bigger than the mark */}
                  <rect
                    x={i * barWidth}
                    y={0}
                    width={barWidth}
                    height={plotHeight}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  {barHeight > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={barHeight}
                      rx="1.2"
                      fill={SERIES}
                      opacity={hover === null || active ? 1 : 0.45}
                      pointerEvents="none"
                    />
                  )}
                  {/* Selective direct label: the peak only, never every bar */}
                  {i === peak && d.value > 0 && !active && (
                    <text
                      x={i * barWidth + barWidth / 2}
                      y={y - 3}
                      textAnchor="middle"
                      className="fill-white/70"
                      style={{ fontSize: 8, fontWeight: 800 }}
                      pointerEvents="none"
                    >
                      {formatValue(d.value)}
                    </text>
                  )}
                  <text
                    x={i * barWidth + barWidth / 2}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-white/30"
                    style={{ fontSize: 8, fontWeight: 700 }}
                    pointerEvents="none"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hover !== null && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-zinc-800 px-2 py-1 shadow-lg"
              style={{
                left: `${(hover + 0.5) * barWidth}%`,
                top: plotHeight - (max > 0 ? (data[hover].value / max) * (plotHeight - 8) : 0) - 6,
              }}
            >
              <p className="whitespace-nowrap text-[10px] font-black text-white">
                {formatValue(data[hover].value)}
              </p>
              <p className="whitespace-nowrap text-[9px] text-white/40">{data[hover].label}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
