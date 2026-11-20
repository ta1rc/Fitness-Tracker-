import { useState, type ReactNode } from "react";
import { api, emptyMetrics, kindLabel, totals, type DayMetrics, type DayStat, type Workout } from "../api";
import { useData, useSettings, useStore } from "../store";
import { addDays, daysBetween, shortDate, today, weekStart, weekdayNarrow } from "../lib/date";
import { dec, wt, distUnit, fmtDuration, fmtSleep, fmtWater, glassMl, int, kgTo, kmTo, mlTo, round, toKg, toMl, waterUnit, weightUnit } from "../lib/units";
import { Card, CardHead, Delta, Empty, NumberField } from "../components/ui";
import { MealList } from "../components/MealList";
import { IEdit, IPlus } from "../components/icons";

export function Today() {
  const day = useStore((s) => s.day);
  const data = useData(() => api.getDay(day), [day]);
  const ws = weekStart(day);
  const week = useData(() => api.rangeStats(ws, addDays(ws, 6)), [ws]);
  const recentWeights = useData(() => api.rangeStats(addDays(day, -30), day), [day]);
  const logged = useData(() => api.loggedDays(), []);

  if (!data) return null;
  const t = totals(data.entries);
  const burned = data.workouts.reduce((a, w) => a + (w.kcal ?? 0), 0);
  const m = data.metrics;

  const saveMetrics = async (patch: Partial<DayMetrics>) => {
    await api.setMetrics(day, { ...emptyMetrics(), ...m, ...patch });
    useStore.getState().bump();
  };

  return (
    <div className="stagger sheet grid grid-cols-12">
      <EnergyCell className="col-span-8" eaten={t} burned={burned} />
      <WeekCell className="col-span-4" day={day} week={week ?? []} logged={logged ?? []} />

      <WaterTile value={m.water_ml} onChange={(v) => void saveMetrics({ water_ml: v })} />
      <StepsTile value={m.steps} onChange={(v) => void saveMetrics({ steps: v })} />
      <SleepTile value={m.sleep_h} onChange={(v) => void saveMetrics({ sleep_h: v })} />
      <WeightTile value={m.weight_kg} history={recentWeights ?? []} day={day} onChange={(v) => void saveMetrics({ weight_kg: v })} />

      <Card className="col-span-8 !px-7">
        <CardHead title="Food" index="07" sub={`${data.entries.length} item${data.entries.length === 1 ? "" : "s"} · ${int(t.kcal)} kcal · fibre ${int(t.fiber)} g`} />
        <MealList day={day} entries={data.entries} />
      </Card>

      <div className="stack col-span-4">
        <PlanCell day={day} />
        <TrainingCell day={day} workouts={data.workouts} />
        <FeelCell metrics={m} onSave={(p) => void saveMetrics(p)} />
      </div>
    </div>
  );
}

// ———————————————————————————————————————————————————————————— energy

function EnergyCell({ eaten, burned, className }: { eaten: ReturnType<typeof totals>; burned: number; className: string }) {
  const s = useSettings();
  const left = s.kcal - eaten.kcal;
  const over = left < 0;
  const pk = eaten.protein * 4;
  const ck = eaten.carbs * 4;
  const fk = eaten.fat * 9;
  const scale = Math.max(s.kcal, eaten.kcal) * 1.02 || 1;
  const pct = Math.round((eaten.kcal / (s.kcal || 1)) * 100);

  return (
    <Card className={`${className} !px-7 !py-7`}>
      <div className="flex items-start justify-between">
        <div className="label flex items-center gap-2">
          <span className="opacity-60">01</span> Energy
        </div>
        <div className="mono num text-[10.5px] text-ink3">{pct}% OF {int(s.kcal)}</div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-8">
        <div className="flex items-baseline gap-3">
          <span className="num display text-[96px] leading-[0.82]" style={{ color: over ? "var(--danger)" : undefined }}>
            {int(Math.abs(left))}
          </span>
          <span className="pb-1 text-[15px] text-ink2">{over ? "kcal over" : "kcal left"}</span>
        </div>
        <dl className="num grid grid-cols-3 gap-8 pb-1 text-right">
          <Stat label="Target" value={int(s.kcal)} />
          <Stat label="Eaten" value={int(eaten.kcal)} />
          <Stat label="Burned" value={burned ? int(burned) : "—"} />
        </dl>
      </div>

      {/* Calories as macro segments, with a tick at the target. */}
      <div className="relative mt-8 h-[10px] w-full">
        <div className="absolute inset-0 rounded-full" style={{ background: "var(--line)" }} />
        <div className="bar-grow absolute inset-y-0 left-0 flex gap-[2px] overflow-hidden rounded-full" style={{ width: `${(eaten.kcal / scale) * 100}%` }}>
          {[
            [pk, "var(--protein)"],
            [ck, "var(--carbs)"],
            [fk, "var(--fat)"],
          ].map(([v, c], i) => (
            <div key={i} style={{ flex: (v as number) || 0.0001, background: c as string }} className="h-full" />
          ))}
        </div>
        <div className="absolute -top-[5px] h-[20px] w-[1.5px]" style={{ left: `${(s.kcal / scale) * 100}%`, background: "var(--ink)" }} />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-10">
        <MacroCol label="Protein" value={eaten.protein} target={s.protein} color="var(--protein)" />
        <MacroCol label="Carbs" value={eaten.carbs} target={s.carbs} color="var(--carbs)" />
        <MacroCol label="Fat" value={eaten.fat} target={s.fat} color="var(--fat)" />
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1.5 text-[19px] font-light tracking-tight">{value}</dd>
    </div>
  );
}

function MacroCol({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const left = target - value;
  const pct = Math.min(1, value / (target || 1));
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12.5px] text-ink2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="mono num text-[10.5px] text-ink3">{left >= 0 ? `${int(left)}G LEFT` : `${int(-left)}G OVER`}</span>
      </div>
      <div className="num mt-2 flex items-baseline gap-1">
        <span className="display text-[30px] leading-none">{int(value)}</span>
        <span className="mono text-[11px] text-ink3">/ {int(target)} G</span>
      </div>
      <div className="mt-3 h-[2px] w-full" style={{ background: "var(--line)" }}>
        <div className="bar-grow h-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ———————————————————————————————————————————————————————————— week

function streakFrom(days: string[]): number {
  const set = new Set(days);
  let d = today();
  if (!set.has(d)) d = addDays(d, -1);
  let n = 0;
  while (set.has(d)) n++, (d = addDays(d, -1));
  return n;
}

function WeekCell({ day, week, logged, className }: { day: string; week: DayStat[]; logged: string[]; className: string }) {
  const s = useSettings();
  const setDay = useStore((x) => x.setDay);
  const ws = weekStart(day);
  const days = daysBetween(ws, addDays(ws, 6));
  const byDay = new Map(week.map((w) => [w.day, w]));
  const sessions = week.reduce((a, w) => a + w.workouts, 0);
  const eatDays = week.filter((w) => w.kcal > 0);
  const avg = eatDays.length ? eatDays.reduce((a, w) => a + w.kcal, 0) / eatDays.length : 0;
  const streak = streakFrom(logged);
  const max = Math.max(s.kcal * 1.25, ...week.map((w) => w.kcal));

  return (
    <Card className={`${className} !py-7`}>
      <CardHead title="This week" index="02" right={<span className="mono text-[10.5px] text-ink3">{streak ? `${streak} DAY STREAK` : "NO STREAK YET"}</span>} />
      <div className="flex h-[118px] items-end gap-[6px]">
        {days.map((d) => {
          const w = byDay.get(d);
          const k = w?.kcal ?? 0;
          const sel = d === day;
          const future = d > today();
          const off = k > s.kcal * 1.1;
          return (
            <button key={d} disabled={future} onClick={() => setDay(d)} className="group flex h-full flex-1 flex-col items-center gap-2">
              <div className="relative w-full flex-1">
                <div className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${(s.kcal / max) * 100}%`, borderColor: "var(--line-2)" }} />
                <div
                  className="bar-grow absolute inset-x-0 bottom-0 rounded-[3px]"
                  style={{ height: `${Math.max(k ? 3 : 0, (k / max) * 100)}%`, background: off ? "var(--warn)" : sel ? "var(--ink)" : "var(--ink-3)", opacity: sel ? 1 : 0.5 }}
                />
                {!k && !future && <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: "var(--line-2)" }} />}
              </div>
              <span className="mono text-[10px]" style={{ color: sel ? "var(--ink)" : "var(--ink-3)" }}>
                {weekdayNarrow(d)}
              </span>
              <span className="h-[3px] w-[3px] rounded-full" style={{ background: w?.workouts ? "var(--accent)" : "transparent" }} />
            </button>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 pt-4" style={{ boxShadow: "0 -1px 0 var(--line)" }}>
        <div>
          <div className="label">Sessions</div>
          <div className="num mt-1.5 flex items-baseline gap-1">
            <span className="display text-[26px] leading-none">{sessions}</span>
            <span className="mono text-[11px] text-ink3">/ {s.workouts_per_week}</span>
          </div>
        </div>
        <div>
          <div className="label">Avg intake</div>
          <div className="num mt-1.5 flex items-baseline gap-1">
            <span className="display text-[26px] leading-none">{avg ? int(avg) : "—"}</span>
            {avg > 0 && <span className="mono text-[11px] text-ink3">KCAL</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ———————————————————————————————————————————————————————————— metric tiles

function Tile({ index, label, color, children, pct, foot }: { index: string; label: string; color: string; children: ReactNode; pct: number; foot?: ReactNode }) {
  return (
    <Card className="col-span-3 flex flex-col !pb-0">
      <div className="label flex items-center gap-2">
        <span className="opacity-60">{index}</span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {foot && <div className="mt-3">{foot}</div>}
      {/* Progress runs along the cell's bottom edge. */}
      <div className="relative -mx-6 mt-5 h-[3px]" style={{ background: "transparent" }}>
        <div className="bar-grow h-full" style={{ width: `${Math.min(1, pct) * 100}%`, background: color }} />
      </div>
    </Card>
  );
}

/** Click to edit; Enter or blur saves. */
function Editable({ display, value, onSave, step, dp = 0, suffix }: { display: ReactNode; value: number | null; onSave: (v: number | null) => void; step: number; dp?: number; suffix?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (editing)
    return (
      <div
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setEditing(false), onSave(v);
        }}
        onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setEditing(false))}
      >
        <NumberField autoFocus value={v} onChange={setV} step={step} dp={dp} suffix={suffix} size="lg" onEnter={() => (setEditing(false), onSave(v))} />
      </div>
    );
  return (
    <button className="focusable -mx-1 rounded-md px-1 text-left transition-colors hover:bg-sunk" onClick={() => (setV(value), setEditing(true))}>
      {display}
    </button>
  );
}

function Big({ value, unit, of }: { value: ReactNode; unit?: string; of?: string }) {
  return (
    <span className="num flex items-baseline gap-1.5">
      <span className="display text-[40px] leading-none">{value}</span>
      {unit && <span className="mono text-[11px] text-ink3">{unit}</span>}
      {of && <span className="mono text-[11px] text-ink3">/ {of}</span>}
    </span>
  );
}

function WaterTile({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const s = useSettings();
  const g = glassMl(s.units);
  const ml = value ?? 0;
  const glasses = Math.round(ml / g);
  const goalGlasses = Math.max(1, Math.round(s.water_ml / g));
  const shown = fmtWater(ml, s.units).split(" ");
  return (
    <Tile
      index="03"
      label="Water"
      color="var(--water)"
      pct={ml / s.water_ml}
      foot={
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-wrap gap-[3px]">
            {Array.from({ length: Math.max(goalGlasses, glasses) }, (_, i) => (
              <span key={i} className="h-[14px] w-[5px] rounded-[1.5px] transition-colors" style={{ background: i < glasses ? "var(--water)" : "var(--line-2)" }} />
            ))}
          </div>
          <button className="btn btn-sm btn-icon" disabled={!ml} onClick={() => onChange(Math.max(0, ml - g) || null)} aria-label="Remove a glass">
            −
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => onChange(ml + g)}>
            <IPlus size={11} /> {s.units === "imperial" ? "8 oz" : "250"}
          </button>
        </div>
      }
    >
      <Editable
        value={value == null ? null : round(mlTo(value, s.units))}
        onSave={(v) => onChange(v == null ? null : toMl(v, s.units))}
        step={s.units === "imperial" ? 8 : 250}
        suffix={waterUnit(s.units)}
        display={<Big value={shown[0]} unit={shown[1]?.toUpperCase()} of={fmtWater(s.water_ml, s.units).toUpperCase()} />}
      />
    </Tile>
  );
}

function StepsTile({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const s = useSettings();
  return (
    <Tile index="04" label="Steps" color="var(--steps)" pct={(value ?? 0) / s.steps} foot={<p className="text-[12px] text-ink3">{value == null ? "Click the number to enter" : value >= s.steps ? "Goal reached" : `${int(s.steps - value)} to go`}</p>}>
      <Editable value={value} onSave={(v) => onChange(v == null ? null : Math.round(v))} step={500} display={<Big value={value == null ? <span className="text-ink3">—</span> : int(value)} of={int(s.steps)} />} />
    </Tile>
  );
}

function SleepTile({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const s = useSettings();
  return (
    <Tile
      index="05"
      label="Sleep"
      color="var(--sleep)"
      pct={(value ?? 0) / s.sleep_h}
      foot={<p className="text-[12px] text-ink3">{value == null ? "Last night, in hours" : value >= s.sleep_h ? "Well rested" : `${fmtSleep(s.sleep_h - value)} short`}</p>}
    >
      <Editable value={value} onSave={onChange} step={0.25} dp={2} suffix="h" display={<Big value={value == null ? <span className="text-ink3">—</span> : fmtSleep(value)} of={fmtSleep(s.sleep_h).toUpperCase()} />} />
    </Tile>
  );
}

function WeightTile({ value, history, day, onChange }: { value: number | null; history: DayStat[]; day: string; onChange: (v: number | null) => void }) {
  const s = useSettings();
  const prev = [...history].reverse().find((h) => h.day < day && h.weight_kg != null);
  const weekAgo = history.filter((h) => h.weight_kg != null && h.day <= addDays(day, -6)).pop();
  const latest = value ?? [...history].reverse().find((h) => h.weight_kg != null)?.weight_kg ?? null;
  const delta = value != null && weekAgo?.weight_kg != null ? kgTo(value - weekAgo.weight_kg, s.units) : null;
  const toGoal = latest != null && s.goal_weight_kg != null ? kgTo(latest - s.goal_weight_kg, s.units) : null;
  const losing = s.goal_weight_kg != null && latest != null && s.goal_weight_kg < latest;
  const wu = weightUnit(s.units);

  return (
    <Tile
      index="06"
      label="Weight"
      color="var(--ink)"
      pct={value != null ? 1 : 0}
      foot={
        <div className="num flex items-center justify-between text-[12px]">
          <span className="text-ink3">
            {value == null
              ? prev?.weight_kg != null
                ? `Last ${wt(prev.weight_kg, s.units)} ${wu}`
                : "Weigh in to start a trend"
              : toGoal != null
                ? Math.abs(toGoal) < 0.05
                  ? "At goal"
                  : `${dec(Math.abs(toGoal))} ${wu} to goal`
                : "7-day change"}
          </span>
          <Delta value={delta} unit={` ${wu}`} invert={losing} />
        </div>
      }
    >
      <Editable
        value={value == null ? (prev?.weight_kg != null ? round(kgTo(prev.weight_kg, s.units), 1) : null) : round(kgTo(value, s.units), 1)}
        onSave={(v) => onChange(v == null ? null : toKg(v, s.units))}
        step={0.1}
        dp={1}
        suffix={wu}
        display={<Big value={value == null ? <span className="text-ink3">—</span> : wt(value, s.units)} unit={wu.toUpperCase()} />}
      />
    </Tile>
  );
}

// ———————————————————————————————————————————————————————————— plan, training, feel

function PlanCell({ day }: { day: string }) {
  const go = useStore((x) => x.go);
  const sv = useData(() => api.coachSession(day), [day]);
  if (sv === undefined) return null;
  return (
    <Card>
      <CardHead
        title="Program"
        index="08"
        right={
          <button className="btn btn-sm -mr-2 -mt-1" onClick={() => go("program")}>
            Open →
          </button>
        }
      />
      {!sv ? (
        <Empty title="No plan yet.">Answer eight questions and Tally builds your calories, macros and a full training split.</Empty>
      ) : sv.session ? (
        <button className="w-full text-left" onClick={() => go("program")}>
          <div className="title text-[22px] leading-tight">{sv.session.name}</div>
          <div className="mono mt-1.5 text-[10.5px] uppercase text-ink3">
            {sv.session.exercises.length} exercises · {sv.session.minutes} min · week {sv.week_index + 1} · {sv.week.deload ? "deload" : `RIR ${sv.week.rir}`}
          </div>
          <div className="mt-3 space-y-1">
            {sv.session.exercises.slice(0, 3).map((e) => (
              <div key={e.exercise_id} className="flex justify-between text-[12.5px] text-ink2">
                <span className="truncate">{e.name}</span>
                <span className="num mono shrink-0 pl-3 text-[11px] text-ink3">
                  {e.sets}×{e.rep_low}–{e.rep_high}
                </span>
              </div>
            ))}
            {sv.session.exercises.length > 3 && <div className="text-[12px] text-ink3">+{sv.session.exercises.length - 3} more</div>}
          </div>
        </button>
      ) : (
        <div>
          <div className="title text-[22px] leading-tight">Rest day</div>
          <p className="mt-1.5 text-[12.5px] text-ink2">{sv.next ? `Next: ${sv.next[1]}, ${shortDate(sv.next[0])}.` : ""} Walk, sleep, eat your protein.</p>
        </div>
      )}
    </Card>
  );
}

function TrainingCell({ day, workouts }: { day: string; workouts: Workout[] }) {
  const s = useSettings();
  const open = useStore((x) => x.open);
  return (
    <Card>
      <CardHead
        title="Logged training"
        index="09"
        right={
          <button className="btn btn-sm -mr-2 -mt-1" onClick={() => open({ type: "workout", day })}>
            <IPlus size={11} /> Log
          </button>
        }
      />
      {workouts.length === 0 ? (
        <Empty title="Nothing logged yet." />
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {workouts.map((w) => {
            const exercises = [...new Set(w.sets.map((x) => x.exercise))];
            const vol = w.sets.reduce((a, x) => a + (x.reps ?? 0) * (x.weight_kg ?? 0), 0);
            return (
              <li key={w.id}>
                <button className="row-hover group flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left" onClick={() => open({ type: "workout", day, workout: w })} title="Edit">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{w.title}</span>
                    <span className="num block truncate text-[12px] text-ink3">
                      {[
                        kindLabel(w.kind),
                        fmtDuration(w.duration_min),
                        w.distance_km != null && `${dec(kmTo(w.distance_km, s.units))} ${distUnit(s.units)}`,
                        w.sets.length > 0 && `${exercises.length} ex · ${w.sets.length} sets`,
                        vol > 0 && `${int(kgTo(vol, s.units))} ${weightUnit(s.units)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {w.kcal != null && <span className="mono num text-[11px] text-ink2">{int(w.kcal)} KCAL</span>}
                  <IEdit size={12} className="self-center text-ink3 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const MOODS = ["Drained", "Low", "Okay", "Good", "Great"];

function FeelCell({ metrics, onSave }: { metrics: DayMetrics; onSave: (p: Partial<DayMetrics>) => void }) {
  const [note, setNote] = useState(metrics.note ?? "");
  const [lastNote, setLastNote] = useState(metrics.note);
  if (metrics.note !== lastNote) setLastNote(metrics.note), setNote(metrics.note ?? "");
  return (
    <Card>
      <CardHead title="How you feel" index="10" right={<span className="mono text-[10.5px] text-ink3">{metrics.energy ? MOODS[metrics.energy - 1].toUpperCase() : ""}</span>} />
      <div className="flex items-end gap-[6px]">
        {MOODS.map((label, i) => {
          const v = i + 1;
          const on = metrics.energy != null && v <= metrics.energy;
          return (
            <button
              key={v}
              title={label}
              onClick={() => onSave({ energy: metrics.energy === v ? null : v })}
              className="flex-1 rounded-[3px] transition-colors"
              style={{ height: 10 + i * 6, background: on ? "var(--accent)" : "var(--line-2)" }}
            />
          );
        })}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (metrics.note ?? "") && onSave({ note: note.trim() || null })}
        placeholder="A line about today…"
        className="input mt-4 !h-auto min-h-[52px] resize-none py-2 leading-relaxed"
      />
    </Card>
  );
}
