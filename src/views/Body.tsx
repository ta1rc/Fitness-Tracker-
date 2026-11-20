import { useMemo, useState } from "react";
import { api, emptyMetrics } from "../api";
import { useData, useSettings, useStore } from "../store";
import { addDays, diffDays, longDate, relativeDay, shortDate, today } from "../lib/date";
import { dec, wt, kgTo, round, toKg, weightUnit } from "../lib/units";
import { trend } from "../lib/energy";
import { Lines, Spark } from "../components/charts";
import { Card, CardHead, Delta, Empty, Figure, NumberField, Segmented } from "../components/ui";

type Span = 30 | 90 | 365 | 0;

/** Least-squares slope of the trend, in kg per day. */
function slope(points: [string, number][]): number | null {
  if (points.length < 5) return null;
  const x0 = points[0][0];
  const xs = points.map(([d]) => diffDays(d, x0));
  const ys = points.map(([, v]) => v);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) (num += (xs[i] - mx) * (ys[i] - my)), (den += (xs[i] - mx) ** 2);
  return den ? num / den : null;
}

export function Body() {
  const s = useSettings();
  const raw = useData(() => api.weightSeries(), []) ?? [];
  const [span, setSpan] = useState<Span>(90);
  const t = useMemo(() => trend(raw), [raw]);
  const wu = weightUnit(s.units);
  const end = today();
  const from = span ? addDays(end, -(span - 1)) : raw[0]?.[0] ?? addDays(end, -29);
  const inRange = <T extends [string, number]>(xs: T[]) => xs.filter(([d]) => d >= from);

  const current = t.length ? t[t.length - 1][1] : null;
  const at = (daysBack: number) => {
    const cut = addDays(end, -daysBack);
    const p = [...t].reverse().find(([d]) => d <= cut);
    return p ? p[1] : null;
  };
  const w7 = at(7);
  const w30 = at(30);
  const recent = t.filter(([d]) => d > addDays(end, -28));
  const perDay = slope(recent);
  const perWeek = perDay == null ? null : perDay * 7;
  const goal = s.goal_weight_kg;
  let eta: string | null = null;
  if (goal != null && current != null && perDay && Math.sign(goal - current) === Math.sign(perDay)) {
    const days = Math.round((goal - current) / perDay);
    if (days > 0 && days < 3650) eta = addDays(end, days);
  }
  const losing = goal != null && current != null && goal < current;

  return (
    <div className="stagger sheet grid grid-cols-12">
      <Card className="col-span-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="eyebrow">Trend weight</div>
            <div className="mt-2 flex items-baseline gap-3">
              {current != null ? <Figure value={wt(current, s.units)} unit={wu} size={44} /> : <span className="text-ink3">—</span>}
              {perWeek != null && (
                <span className="num text-[13px] text-ink2">
                  <Delta value={kgTo(perWeek, s.units)} unit={` ${wu}`} invert={losing} dp={2} /> per week
                </span>
              )}
            </div>
            <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-ink3">
              Smoothed from your weigh-ins, so a salty dinner doesn't look like a setback. Dots are the scale; the line is the trend.
            </p>
          </div>
          <Segmented
            value={span}
            onChange={setSpan}
            options={[
              { value: 30, label: "1M" },
              { value: 90, label: "3M" },
              { value: 365, label: "1Y" },
              { value: 0, label: "All" },
            ]}
          />
        </div>
        {raw.length === 0 ? (
          <div className="py-10">
            <Empty title="No weigh-ins yet">Log one on the right. Weigh in at the same time each day, ideally right after waking, for the cleanest trend.</Empty>
          </div>
        ) : (
          <Lines
            height={260}
            from={from}
            to={end}
            format={(v) => wt(v, s.units)}
            goal={goal != null ? { value: goal, label: `Goal ${wt(goal, s.units)} ${wu}` } : null}
            tipLabel={(d) => longDate(d)}
            series={[
              { points: inRange(t), color: "var(--ink)", width: 2.25 },
              { points: inRange(raw), color: "var(--ink-3)", width: 0, dots: true },
            ]}
          />
        )}
      </Card>

      <div className="stack col-span-4">
        <WeighIn last={raw[raw.length - 1] ?? null} />
        <Card>
          <CardHead title="Change" />
          <dl className="space-y-3 text-[13px]">
            <Row label="Past 7 days" value={current != null && w7 != null ? <Delta value={kgTo(current - w7, s.units)} unit={` ${wu}`} invert={losing} /> : "—"} />
            <Row label="Past 30 days" value={current != null && w30 != null ? <Delta value={kgTo(current - w30, s.units)} unit={` ${wu}`} invert={losing} /> : "—"} />
            <Row label="Since first weigh-in" value={current != null && t.length ? <Delta value={kgTo(current - t[0][1], s.units)} unit={` ${wu}`} invert={losing} /> : "—"} />
            <div className="border-t border-line pt-3" />
            <Row label="Goal" value={goal != null ? `${wt(goal, s.units)} ${wu}` : <button className="text-accent" onClick={() => useStore.getState().go("goals")}>Set one</button>} />
            {goal != null && current != null && <Row label="To go" value={`${dec(Math.abs(kgTo(current - goal, s.units)))} ${wu}`} />}
            {goal != null && <Row label="At this pace" value={eta ? shortDate(eta) : perDay == null ? "Need more data" : "Not heading there yet"} />}
          </dl>
        </Card>
      </div>

      <Card className="col-span-12" pad={false}>
        <div className="px-5 pb-2 pt-5">
          <h2 className="label">Weigh-ins</h2>
        </div>
        {raw.length === 0 ? (
          <div className="px-5 pb-5">
            <Empty title="Nothing logged" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-6 px-5 pb-4">
            {[...raw]
              .reverse()
              .slice(0, 28)
              .map(([d, v], i, arr) => {
                const prev = arr[i + 1];
                return (
                  <div key={d} className="flex items-baseline justify-between border-b border-line py-2 text-[13px]">
                    <span className="text-ink2">{relativeDay(d)}</span>
                    <span className="num flex items-baseline gap-3">
                      {prev && <span className="text-[11px]"><Delta value={kgTo(v - prev[1], s.units)} invert={losing} /></span>}
                      <span className="font-medium">{wt(v, s.units)}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink2">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}

function WeighIn({ last }: { last: [string, number] | null }) {
  const s = useSettings();
  const day = useStore((x) => x.day);
  const data = useData(() => api.getDay(day), [day]);
  const existing = data?.metrics.weight_kg ?? null;
  const [v, setV] = useState<number | null>(null);
  const shown = v ?? (existing != null ? round(kgTo(existing, s.units), 1) : last ? round(kgTo(last[1], s.units), 1) : null);
  const series = useData(() => api.weightSeries(), []) ?? [];

  const save = async () => {
    if (shown == null || !data) return;
    await api.setMetrics(day, { ...emptyMetrics(), ...data.metrics, weight_kg: toKg(shown, s.units) });
    setV(null);
    useStore.getState().bump();
    useStore.getState().notify(`Weight logged for ${relativeDay(day).toLowerCase()}`);
  };

  return (
    <Card>
      <CardHead title={`Weigh in · ${relativeDay(day)}`} right={<Spark values={series.slice(-14).map((p) => p[1])} color="var(--ink-2)" width={80} height={24} />} />
      <div className="flex gap-2">
        <NumberField value={shown} onChange={setV} step={0.1} dp={1} suffix={weightUnit(s.units)} size="lg" className="flex-1" onEnter={() => void save()} />
        <button className="btn btn-primary !h-11 px-4" onClick={() => void save()}>
          {existing != null ? "Update" : "Log"}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-ink3">{existing != null ? `Logged ${wt(existing, s.units)} ${weightUnit(s.units)} for this day` : "Use ↑ ↓ to nudge by 0.1"}</p>
    </Card>
  );
}
