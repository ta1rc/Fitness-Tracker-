import { useMemo, useState } from "react";
import { api, type DayStat } from "../api";
import { useData, useSettings } from "../store";
import { addDays, daysBetween, monthShort, parseDay, shortDate, today, weekdayNarrow } from "../lib/date";
import { dec, fmtSleep, fmtWater, int, mlTo } from "../lib/units";
import { Bars, YearGrid } from "../components/charts";
import { Card, CardHead, Segmented } from "../components/ui";

type Span = 7 | 30 | 90;

export function Trends() {
  const s = useSettings();
  const [span, setSpan] = useState<Span>(30);
  const end = today();
  const from = addDays(end, -(span - 1));
  const stats = useData(() => api.rangeStats(from, end), [from, end]) ?? [];
  const year = useData(() => api.rangeStats(addDays(end, -371), end), [end]) ?? [];
  const days = daysBetween(from, end);
  const by = new Map(stats.map((x) => [x.day, x]));

  const label = (d: string) => (span === 7 ? weekdayNarrow(d) : parseDay(d).getDate() === 1 || d === from ? monthShort(d) : String(parseDay(d).getDate()));
  const every = span === 7 ? 1 : span === 30 ? 5 : 14;
  const series = (k: keyof DayStat, f: (v: number) => number = (v) => v) =>
    days.map((d) => {
      const v = by.get(d)?.[k] as number | null | undefined;
      return { key: d, value: v ? f(v) : null, label: label(d) };
    });

  const mean = (k: keyof DayStat) => {
    const xs = stats.map((x) => x[k] as number | null).filter((v): v is number => v != null && v > 0);
    return xs.length ? { v: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length } : null;
  };

  /** Year grid: how many of food / training / body were logged that day. */
  const levels = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of year) {
      const n = (x.entries > 0 ? 1 : 0) + (x.workouts > 0 ? 1 : 0) + (x.weight_kg != null || x.steps != null || x.sleep_h != null || x.water_ml != null ? 1 : 0);
      if (n) m.set(x.day, n === 3 ? 4 : n === 2 ? 3 : x.workouts ? 2 : 1);
    }
    return m;
  }, [year]);
  const activeDays = levels.size;

  const kcal = mean("kcal");
  const protein = mean("protein");
  const steps = mean("steps");
  const sleep = mean("sleep_h");
  const water = mean("water_ml");
  const sessions = stats.reduce((a, x) => a + x.workouts, 0);

  return (
    <div className="stagger sheet grid grid-cols-12">
      <div className="cell col-span-12 flex items-center justify-between !py-3.5">
        <p className="text-[13px] text-ink2">
          Averages count only days with something logged. <span className="text-ink3">{shortDate(from)} – {shortDate(end)}</span>
        </p>
        <Segmented
          value={span}
          onChange={setSpan}
          options={[
            { value: 7, label: "Week" },
            { value: 30, label: "Month" },
            { value: 90, label: "Quarter" },
          ]}
        />
      </div>

      <Card className="col-span-12 !py-4">
        <div className="grid grid-cols-6 divide-x divide-line">
          <Avg label="Calories" value={kcal ? int(kcal.v) : "—"} unit="kcal" target={`of ${int(s.kcal)}`} n={kcal?.n} />
          <Avg label="Protein" value={protein ? int(protein.v) : "—"} unit="g" target={`of ${int(s.protein)}`} n={protein?.n} color="var(--protein)" />
          <Avg label="Steps" value={steps ? int(steps.v) : "—"} target={`of ${int(s.steps)}`} n={steps?.n} color="var(--steps)" />
          <Avg label="Sleep" value={sleep ? fmtSleep(sleep.v) : "—"} target={`of ${fmtSleep(s.sleep_h)}`} n={sleep?.n} color="var(--sleep)" />
          <Avg label="Water" value={water ? fmtWater(water.v, s.units) : "—"} target={`of ${fmtWater(s.water_ml, s.units)}`} n={water?.n} color="var(--water)" />
          <Avg label="Workouts" value={String(sessions)} target={`goal ${Math.round((s.workouts_per_week * span) / 7)}`} color="var(--accent)" />
        </div>
      </Card>

      <Card className="col-span-6">
        <CardHead title="Calories" sub="Amber days ran more than 5% over target" />
        <Bars height={150} color="var(--ink-2)" overColor="var(--warn)" target={s.kcal} format={(v) => `${int(v)} kcal`} labelEvery={every} data={series("kcal")} />
      </Card>
      <Card className="col-span-6">
        <CardHead title="Protein" sub={protein ? `${Math.round((protein.v / s.protein) * 100)}% of target on average` : "No food logged"} />
        <Bars height={150} color="var(--protein)" target={s.protein} format={(v) => `${int(v)} g`} labelEvery={every} data={series("protein")} />
      </Card>
      <Card className="col-span-4">
        <CardHead title="Steps" />
        <Bars height={120} color="var(--steps)" target={s.steps} format={(v) => int(v)} labelEvery={every} data={series("steps")} />
      </Card>
      <Card className="col-span-4">
        <CardHead title="Sleep" />
        <Bars height={120} color="var(--sleep)" target={s.sleep_h} format={(v) => fmtSleep(v)} labelEvery={every} data={series("sleep_h")} />
      </Card>
      <Card className="col-span-4">
        <CardHead title="Water" />
        <Bars
          height={120}
          color="var(--water)"
          target={mlTo(s.water_ml, s.units)}
          format={(v) => (s.units === "imperial" ? `${int(v)} fl oz` : `${dec(v / 1000)} L`)}
          labelEvery={every}
          data={series("water_ml", (v) => mlTo(v, s.units))}
        />
      </Card>

      <Card className="col-span-12">
        <CardHead title="Consistency" sub={`${activeDays} days with something logged in the past year. Darker means more of food, training and body were logged.`} />
        <YearGrid levels={levels} color="var(--accent)" />
      </Card>
    </div>
  );
}

function Avg({ label, value, unit, target, n, color }: { label: string; value: string; unit?: string; target: string; n?: number; color?: string }) {
  return (
    <div className="px-4 first:pl-1">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink3">
        {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </div>
      <div className="num display mt-1.5 text-[22px] font-semibold leading-none">
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal tracking-normal text-ink3">{unit}</span>}
      </div>
      <div className="num mt-1 text-[11px] text-ink3">
        {target}
        {n != null && ` · ${n}d`}
      </div>
    </div>
  );
}
