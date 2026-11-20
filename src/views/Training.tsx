import { useMemo, useState } from "react";
import { api, kindLabel, type Workout } from "../api";
import { useData, useSettings, useStore } from "../store";
import { addDays, diffDays, relativeDay, shortDate, today, weekStart } from "../lib/date";
import { dec, distUnit, fmtDuration, int, kgTo, kmTo, weightUnit } from "../lib/units";
import { Bars, Lines, Ring } from "../components/charts";
import { Card, CardHead, Empty, Figure } from "../components/ui";
import { IEdit, IPlus } from "../components/icons";

const WEEKS = 12;

export function Training() {
  const s = useSettings();
  const open = useStore((x) => x.open);
  const end = today();
  const from = addDays(weekStart(end), -(WEEKS - 1) * 7);
  const workouts = useData(() => api.listWorkouts(from, end), [from, end]) ?? [];
  const summaries = useData(() => api.exerciseSummaries(), []) ?? [];
  const [ex, setEx] = useState<string | null>(null);
  const exercise = ex ?? summaries[0]?.exercise ?? null;
  const history = useData(() => (exercise ? api.exerciseHistory(exercise) : Promise.resolve([])), [exercise]) ?? [];

  const weeks = useMemo(() => {
    const out: { start: string; minutes: number; count: number }[] = [];
    for (let i = 0; i < WEEKS; i++) out.push({ start: addDays(from, i * 7), minutes: 0, count: 0 });
    for (const w of workouts) {
      const i = Math.floor(diffDays(w.day, from) / 7);
      if (out[i]) (out[i].minutes += w.duration_min), out[i].count++;
    }
    return out;
  }, [workouts, from]);

  const thisWeek = weeks[weeks.length - 1];
  const last4 = weeks.slice(-5, -1);
  const avgPerWeek = last4.reduce((a, w) => a + w.count, 0) / 4;
  const month = workouts.filter((w) => w.day > addDays(end, -30));
  const volume30 = month.reduce((a, w) => a + w.sets.reduce((b, x) => b + (x.reps ?? 0) * (x.weight_kg ?? 0), 0), 0);
  const wu = weightUnit(s.units);

  const grouped = useMemo(() => {
    const m = new Map<string, Workout[]>();
    for (const w of workouts) {
      const k = weekStart(w.day);
      m.set(k, [...(m.get(k) ?? []), w]);
    }
    return [...m.entries()];
  }, [workouts]);

  const best = history.length ? Math.max(...history.map((h) => h.e1rm)) : 0;
  const first = history[0]?.e1rm ?? 0;

  return (
    <div className="stagger sheet grid grid-cols-12">
      <Card className="col-span-12 !py-4">
        <div className="grid grid-cols-4 divide-x divide-line">
          <div className="flex items-center gap-4 pr-5">
            <Ring value={thisWeek.count} max={s.workouts_per_week} size={52} stroke={5.5} color="var(--accent)">
              <span className="num text-[13px] font-semibold">{thisWeek.count}</span>
            </Ring>
            <div>
              <div className="eyebrow">This week</div>
              <div className="mt-1 text-[13px] text-ink2">
                {thisWeek.count >= s.workouts_per_week ? "Weekly goal met" : `${s.workouts_per_week - thisWeek.count} more to hit ${s.workouts_per_week}`}
              </div>
            </div>
          </div>
          <Kpi label="Time this week" value={fmtDuration(thisWeek.minutes)} />
          <Kpi label="Usual week" value={dec(avgPerWeek)} unit="sessions" sub="Average of the last 4 weeks" />
          <Kpi label="Lifted, 30 days" value={int(kgTo(volume30, s.units))} unit={wu} sub={`${month.length} sessions`} />
        </div>
      </Card>

      <Card className="col-span-7">
        <CardHead title="Minutes per week" sub={`Last ${WEEKS} weeks`} />
        <Bars
          height={150}
          color="var(--accent)"
          format={(v) => fmtDuration(v)}
          data={weeks.map((w) => ({ key: w.start, value: w.minutes || null, label: shortDate(w.start).split(" ")[0], tip: `Week of ${shortDate(w.start)} · ${w.count} sessions` }))}
          labelEvery={2}
          highlight={thisWeek.start}
        />
      </Card>

      <Card className="col-span-5">
        <CardHead
          title="Strength progress"
          sub={exercise ? `Estimated one-rep max · ${exercise}` : "Log sets to see estimated maxes"}
        />
        {history.length > 0 ? (
          <>
            <div className="mb-3 flex items-baseline gap-4">
              <Figure value={dec(kgTo(best, s.units))} unit={`${wu} best`} />
              {history.length > 1 && (
                <span className="num text-[12px]" style={{ color: best > first ? "var(--good)" : "var(--ink-3)" }}>
                  {best > first ? "+" : ""}
                  {dec(kgTo(best - first, s.units))} {wu} since {shortDate(history[0].day)}
                </span>
              )}
            </div>
            <Lines
              height={130}
              from={history.length > 1 ? history[0].day : addDays(history[0].day, -7)}
              to={history.length > 1 ? history[history.length - 1].day : history[0].day}
              format={(v) => dec(kgTo(v, s.units))}
              series={[
                { points: history.map((h) => [h.day, h.e1rm] as [string, number]), color: "var(--accent)", dots: true, area: true },
                { points: history.map((h) => [h.day, h.top_weight] as [string, number]), color: "var(--ink-3)", width: 1.25, dashed: true },
              ]}
            />
          </>
        ) : (
          <Empty title="No strength sets yet">Log a strength workout with reps and weights. Each exercise gets its own progress line.</Empty>
        )}
      </Card>

      <Card className="col-span-7" pad={false}>
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 className="label">History</h2>
          <button className="btn btn-sm btn-outline" onClick={() => open({ type: "workout", day: useStore.getState().day })}>
            <IPlus size={12} /> Log workout
          </button>
        </div>
        {grouped.length === 0 ? (
          <div className="px-5 pb-5">
            <Empty title="No workouts in the last 12 weeks">Every session you log lands here, grouped by week.</Empty>
          </div>
        ) : (
          <div className="scroll max-h-[460px] pb-3">
            {grouped.map(([wk, list]) => (
              <div key={wk}>
                <div className="sticky top-0 z-10 flex items-baseline justify-between bg-[var(--surface-solid)] px-5 py-2">
                  <span className="eyebrow">Week of {shortDate(wk)}</span>
                  <span className="num text-[11px] text-ink3">
                    {list.length} · {fmtDuration(list.reduce((a, w) => a + w.duration_min, 0))}
                  </span>
                </div>
                <ul className="px-3">
                  {list.map((w) => (
                    <li key={w.id}>
                      <button className="row-hover group grid w-full grid-cols-[64px_minmax(0,1fr)_auto_14px] items-center gap-3 rounded-lg px-2 py-2 text-left" title="Edit" onClick={() => open({ type: "workout", day: w.day, workout: w })}>
                        <span className="text-[12px] text-ink3">{relativeDay(w.day)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium">{w.title}</span>
                          <span className="num block truncate text-[12px] text-ink3">
                            {[
                              kindLabel(w.kind),
                              fmtDuration(w.duration_min),
                              w.distance_km != null && `${dec(kmTo(w.distance_km, s.units))} ${distUnit(s.units)}`,
                              w.sets.length > 0 && `${new Set(w.sets.map((x) => x.exercise.toLowerCase())).size} exercises`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="flex gap-[2px]" title={w.effort ? `Effort ${w.effort}/10` : undefined}>
                          {w.effort != null &&
                            Array.from({ length: 10 }, (_, i) => (
                              <span key={i} className="h-3 w-[3px] rounded-full" style={{ background: i < w.effort! ? "var(--accent)" : "var(--sunk)" }} />
                            ))}
                        </span>
                        <IEdit size={12} className="text-ink3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="col-span-5" pad={false}>
        <div className="px-5 pb-2 pt-5">
          <h2 className="label">Exercises</h2>
          <p className="mt-1.5 text-[12.5px] text-ink2">Click one to chart it</p>
        </div>
        {summaries.length === 0 ? (
          <div className="px-5 pb-5">
            <Empty title="Nothing yet" />
          </div>
        ) : (
          <div className="scroll max-h-[460px] px-3 pb-3">
            {summaries.map((x) => (
              <button
                key={x.exercise}
                onClick={() => setEx(x.exercise)}
                className="row-hover grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left"
                style={{ background: x.exercise === exercise ? "var(--sunk)" : undefined }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{x.exercise}</span>
                  <span className="num block text-[11px] text-ink3">
                    {x.sessions} session{x.sessions === 1 ? "" : "s"} · last {relativeDay(x.last_day).toLowerCase()}
                  </span>
                </span>
                <span className="num text-right">
                  <span className="block text-[13px] font-semibold">
                    {x.top_weight ? dec(kgTo(x.top_weight, s.units)) : "—"}
                    <span className="text-[11px] font-normal text-ink3"> {wu}</span>
                  </span>
                  <span className="block text-[11px] text-ink3">e1RM {dec(kgTo(x.e1rm, s.units))}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="px-5">
      <div className="eyebrow">{label}</div>
      <div className="mt-2">
        <Figure value={value} unit={unit} size={24} />
      </div>
      {sub && <div className="mt-1 text-[12px] text-ink3">{sub}</div>}
    </div>
  );
}
