import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, daysBetween, monthShort, parseDay, shortDate, today, weekStart } from "../lib/date";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

// ———————————————————————————————————————————————————————————— bars

export type BarDatum = { key: string; value: number | null; label?: string; tip?: ReactNode };

/**
 * Column chart. A dashed target line; bars over target can tint.
 * Hovering a column shows its tooltip above the chart.
 */
export function Bars({
  data,
  height = 140,
  color,
  target,
  overColor,
  format = (v) => String(Math.round(v)),
  labelEvery = 1,
  highlight,
}: {
  data: BarDatum[];
  height?: number;
  color: string;
  target?: number;
  overColor?: string;
  format?: (v: number) => string;
  labelEvery?: number;
  highlight?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(target ?? 0, ...data.map((d) => d.value ?? 0)) * 1.08);
  const gap = data.length > 40 ? 1 : data.length > 14 ? 3 : 6;
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative select-none">
      <div className="mb-2 flex h-5 items-baseline justify-between text-[12px]">
        {h ? (
          <>
            <span className="text-ink2">{h.tip ?? shortDate(h.key)}</span>
            <span className="num font-semibold">{h.value == null ? "—" : format(h.value)}</span>
          </>
        ) : (
          <>
            <span className="text-ink3">{target != null ? `Target ${format(target)}` : ""}</span>
            <span />
          </>
        )}
      </div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 border-t border-line2" />
        {target != null && target > 0 && (
          <div className="absolute inset-x-0 z-10 border-t border-dashed" style={{ bottom: `${(target / max) * 100}%`, borderColor: "var(--ink-3)" }} />
        )}
        <div className="absolute inset-0 flex items-end" style={{ gap }}>
          {data.map((d, i) => {
            const v = d.value ?? 0;
            const over = overColor && target != null && v > target * 1.05;
            const dim = hover != null && hover !== i;
            return (
              <div key={d.key} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
                <div
                  className="bar-grow w-full"
                  style={{
                    height: `${(v / max) * 100}%`,
                    minHeight: d.value ? 2 : 0,
                    background: over ? overColor : color,
                    opacity: dim ? 0.35 : d.key === highlight || highlight == null ? 1 : 0.55,
                    borderRadius: data.length > 40 ? 1.5 : 4,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex" style={{ gap }}>
        {data.map((d, i) => (
          <div key={d.key} className="num flex-1 text-center text-[10px] text-ink3" style={{ color: hover === i ? "var(--ink)" : undefined }}>
            {i % labelEvery === 0 ? d.label ?? "" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ———————————————————————————————————————————————————————————— lines

export type Series = { points: [string, number][]; color: string; width?: number; dots?: boolean; dashed?: boolean; area?: boolean };

/** Time series over days. X is calendar-true so gaps read as gaps. */
export function Lines({
  series,
  from,
  to,
  height = 200,
  goal,
  format = (v) => String(Math.round(v)),
  tipLabel,
}: {
  series: Series[];
  from: string;
  to: string;
  height?: number;
  goal?: { value: number; label: string } | null;
  format?: (v: number) => string;
  tipLabel?: (day: string) => ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const padL = 40;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  const days = useMemo(() => daysBetween(from, to), [from, to]);
  const all = series.flatMap((s) => s.points.map((p) => p[1]));
  if (goal) all.push(goal.value);

  let lo = all.length ? Math.min(...all) : 0;
  let hi = all.length ? Math.max(...all) : 1;
  if (hi - lo < 1) (lo -= 1), (hi += 1);
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;

  const W = Math.max(0, width - padL - padR);
  const H = height - padT - padB;
  const n = Math.max(1, days.length - 1);
  const idx = useMemo(() => new Map(days.map((d, i) => [d, i])), [days]);
  const x = (d: string) => padL + ((idx.get(d) ?? 0) / n) * W;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * H;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);
  // Month starts for long spans, Mondays for medium, days for short; thinned to fit.
  const candidates = days.filter((d) => (days.length > 70 ? d.endsWith("-01") : days.length > 20 ? parseDay(d).getDay() === 1 : true));
  const maxLabels = Math.max(2, Math.floor(W / 64));
  const labelStride = Math.max(1, Math.ceil(candidates.length / maxLabels));
  const months = candidates;

  const path = (pts: [string, number][]) =>
    pts.map(([d, v], i) => `${i ? "L" : "M"}${x(d).toFixed(1)},${y(v).toFixed(1)}`).join("");

  const hoverVals = hover ? series.map((s) => s.points.find((p) => p[0] === hover)?.[1]) : [];

  return (
    <div ref={ref} className="relative select-none">
      <div className="mb-1 flex h-5 items-baseline justify-between gap-4 text-[12px]">
        {hover ? (
          <>
            <span className="text-ink2">{tipLabel ? tipLabel(hover) : shortDate(hover)}</span>
            <span className="num flex gap-3 font-semibold">
              {hoverVals.map((v, i) =>
                v == null ? null : (
                  <span key={i} style={{ color: i === 0 ? "var(--ink)" : series[i].color }}>
                    {format(v)}
                  </span>
                ),
              )}
            </span>
          </>
        ) : (
          <span className="text-ink3">{goal ? goal.label : ""}</span>
        )}
      </div>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onMouseMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const f = (e.clientX - r.left - padL) / W;
            const i = Math.round(Math.min(1, Math.max(0, f)) * n);
            setHover(days[i]);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-3)" className="num">
                {format(t)}
              </text>
            </g>
          ))}
          {months.map((d, i) =>
            i % labelStride ? null : (
              <text key={d} x={x(d)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--ink-3)" className="num">
                {days.length > 70 ? monthShort(d) : shortDate(d)}
              </text>
            ),
          )}
          {goal && (
            <line x1={padL} x2={width - padR} y1={y(goal.value)} y2={y(goal.value)} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1.25} />
          )}
          {series.map((s, si) => (
            <g key={si}>
              {s.area && s.points.length > 1 && (
                <path
                  d={`${path(s.points)}L${x(s.points[s.points.length - 1][0])},${padT + H}L${x(s.points[0][0])},${padT + H}Z`}
                  fill={s.color}
                  opacity={0.08}
                />
              )}
              {s.points.length > 1 && (
                <path d={path(s.points)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? "3 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
              )}
              {(s.dots || s.points.length === 1) &&
                s.points.map(([d, v]) => <circle key={d} cx={x(d)} cy={y(v)} r={days.length > 120 ? 1.5 : 2.5} fill={s.color} opacity={0.5} />)}
            </g>
          ))}
          {hover && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + H} stroke="var(--ink-3)" strokeWidth={1} />
              {hoverVals.map((v, i) =>
                v == null ? null : <circle key={i} cx={x(hover)} cy={y(v)} r={4} fill="var(--surface)" stroke={series[i].color} strokeWidth={2} />,
              )}
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

// ———————————————————————————————————————————————————————————— year grid

/** A year of days as week columns. `level` is 0..4. */
export function YearGrid({ levels, color, weeks = 53 }: { levels: Map<string, number>; color: string; weeks?: number }) {
  const end = today();
  const start = addDays(weekStart(end), -(weeks - 1) * 7);
  const cols: string[][] = [];
  for (let w = 0; w < weeks; w++) cols.push(Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div>
      <div className="flex gap-[3px]">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-1 flex-col gap-[3px]">
            {col.map((d) => {
              const lv = levels.get(d) ?? 0;
              const future = d > end;
              return (
                <div
                  key={d}
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  className="aspect-square w-full rounded-[3px]"
                  style={{
                    background: future ? "transparent" : lv ? color : "var(--sunk)",
                    opacity: future ? 0 : lv ? 0.25 + lv * 0.1875 : 1,
                    outline: hover === d ? "1.5px solid var(--ink)" : undefined,
                    outlineOffset: 1,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink3">
        <span className="num">{hover ? shortDate(hover) : `${monthShort(start)} – ${monthShort(end)}`}</span>
        <span className="flex items-center gap-1.5">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: l ? color : "var(--sunk)", opacity: l ? 0.25 + l * 0.1875 : 1 }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

// ———————————————————————————————————————————————————————————— ring

export function Ring({ value, max, size = 44, stroke = 5, color, children }: { value: number; max: number; size?: number; stroke?: number; color: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--sunk)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms var(--ease)" }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

/** Compact inline trend line, no axes. */
export function Spark({ values, color, width = 96, height = 28 }: { values: (number | null)[]; color: string; width?: number; height?: number }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (pts.length < 2) return <svg width={width} height={height} />;
  const vs = pts.map((p) => p[1]);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const n = values.length - 1 || 1;
  const X = (i: number) => (i / n) * (width - 4) + 2;
  const Y = (v: number) => (hi === lo ? height / 2 : 3 + (1 - (v - lo) / (hi - lo)) * (height - 6));
  const d = pts.map(([i, v], k) => `${k ? "L" : "M"}${X(i)},${Y(v)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={X(last[0])} cy={Y(last[1])} r={2.5} fill={color} />
    </svg>
  );
}
