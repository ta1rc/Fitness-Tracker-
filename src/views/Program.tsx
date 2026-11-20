import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  GOAL_LABEL,
  MUSCLE_LABEL,
  type ActivePlan,
  type Equipment,
  type Experience,
  type FocusArea,
  type Goal,
  type Lifestyle,
  type Limit,
  type Pace,
  type Plan,
  type PlanSession,
  type Profile,
  type Suggestion,
  type Workout,
} from "../api";
import { useData, useSettings, useStore } from "../store";
import { addDays, parseDay, shortDate, today, weekStart } from "../lib/date";
import { dec, fmtWater, int, kgTo, round, toKg, weightUnit } from "../lib/units";
import { CardHead, Empty, Figure, Meter, NumberField } from "../components/ui";

const YEAR = new Date().getFullYear();
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Program() {
  const active = useData(() => api.coachActive(), []);
  const [retake, setRetake] = useState(false);
  if (active === undefined) return null;
  if (!active || retake) return <Intake previous={active?.plan.profile} onDone={() => setRetake(false)} onCancel={active ? () => setRetake(false) : undefined} />;
  return <PlanView active={active} onRetake={() => setRetake(true)} />;
}

// ———————————————————————————————————————————————————————————— intake

type Opt<T> = { value: T; label: string; hint?: string };

const GOALS: Opt<Goal>[] = [
  { value: "cut", label: "Lose fat", hint: "Calorie deficit, high protein, keep lifting heavy to hold on to muscle." },
  { value: "lean_bulk", label: "Build muscle", hint: "A small surplus sized to how fast you can actually add muscle." },
  { value: "recomp", label: "Recomposition", hint: "Near maintenance: lose a little fat while building. Slow but steady." },
  { value: "strength", label: "Get stronger", hint: "Low-rep work on squat, bench and deadlift, with a slight surplus." },
  { value: "maintain", label: "Maintain", hint: "Hold weight and keep training. Good between phases." },
];
const PACES: Opt<Pace>[] = [
  { value: "gentle", label: "Gentle", hint: "Easiest to stick to; slowest change." },
  { value: "standard", label: "Standard", hint: "The default most people do well on." },
  { value: "aggressive", label: "Aggressive", hint: "Faster, harder. Best for short, focused phases." },
];
const EXPERIENCE: Opt<Experience>[] = [
  { value: "beginner", label: "New to lifting", hint: "Under a year of consistent training." },
  { value: "intermediate", label: "Intermediate", hint: "1–3 years. Linear gains have slowed down." },
  { value: "advanced", label: "Advanced", hint: "3+ years, close to your genetic ceiling." },
];
const EQUIPMENT: Opt<Equipment>[] = [
  { value: "gym", label: "Full gym", hint: "Barbells, machines, cables." },
  { value: "dumbbell", label: "Dumbbells & bench", hint: "Adjustable dumbbells, a bench, maybe a pull-up bar." },
  { value: "home", label: "Bodyweight & bands", hint: "Floor, a pull-up bar and resistance bands." },
];
const LIFESTYLE: Opt<Lifestyle>[] = [
  { value: "desk", label: "Mostly sitting", hint: "Desk job, commute by car or train." },
  { value: "on_feet", label: "On my feet", hint: "Teaching, retail, lots of walking." },
  { value: "manual", label: "Physical work", hint: "Construction, warehouse, trades." },
];
const FOCUS: Opt<FocusArea>[] = (["chest", "back", "shoulders", "arms", "quads", "hamstrings", "glutes", "calves", "abs"] as FocusArea[]).map((f) => ({
  value: f,
  label: f[0].toUpperCase() + f.slice(1),
}));
const LIMITS: Opt<Limit>[] = [
  { value: "knee", label: "Knees" },
  { value: "lower_back", label: "Lower back" },
  { value: "shoulder", label: "Shoulders" },
];

type Step = { key: string; q: string; sub?: string; skip?: (p: Profile) => boolean; body: ReactNode; ready?: boolean };

function Intake({ previous, onDone, onCancel }: { previous?: Profile; onDone: () => void; onCancel?: () => void }) {
  const s = useSettings();
  const weights = useData(() => api.weightSeries(), []);
  const latest = weights?.length ? weights[weights.length - 1][1] : null;
  const [p, setP] = useState<Profile>(
    () =>
      previous ?? {
        sex: s.sex,
        birth_year: s.birth_year ?? 1995,
        height_cm: s.height_cm ?? 175,
        weight_kg: 75,
        body_fat: null,
        goal: "lean_bulk",
        pace: "standard",
        goal_weight_kg: s.goal_weight_kg,
        experience: "intermediate",
        days: Math.min(6, Math.max(2, s.workouts_per_week)),
        session_min: 60,
        equipment: "gym",
        focus: [],
        limits: [],
        lifestyle: "desk",
      },
  );
  useEffect(() => {
    if (!previous && latest != null) setP((x) => ({ ...x, weight_kg: round(latest, 1) }));
  }, [latest, previous]);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const u = s.units;
  const wu = weightUnit(u);

  const choice = <K extends keyof Profile>(k: K, opts: Opt<Profile[K]>[]) => (
    <div className="grid gap-2">
      {opts.map((o, i) => (
        <button key={String(o.value)} className="choice" aria-pressed={p[k] === o.value} onClick={() => set(k, o.value)}>
          <span className="mono w-5 text-[11px] text-ink3">{String.fromCharCode(65 + i)}</span>
          <span className="flex-1">
            <span className="block text-[15.5px] font-medium">{o.label}</span>
            {o.hint && <span className="mt-0.5 block text-[12.5px] text-ink2">{o.hint}</span>}
          </span>
          <span className="h-2 w-2 rounded-full transition-colors" style={{ background: p[k] === o.value ? "var(--accent)" : "transparent" }} />
        </button>
      ))}
    </div>
  );
  const multi = <T extends string>(values: T[], opts: Opt<T>[], onToggle: (v: T) => void, max?: number) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            className="btn"
            style={on ? { background: "var(--ink)", color: "var(--surface-solid)" } : { boxShadow: "inset 0 0 0 1px var(--line-2)" }}
            disabled={!on && max != null && values.length >= max}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
  const toggle = <T,>(xs: T[], v: T) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);

  const steps: Step[] = [
    {
      key: "body",
      q: "Start with the basics.",
      sub: "Used for your energy needs. Body fat is optional; if you know it roughly, the estimate gets better.",
      body: (
        <div className="grid grid-cols-2 gap-x-10 gap-y-7">
          <div>
            <span className="label mb-2 block">Sex</span>
            <div className="seg h-[34px] items-center">
              {(["male", "female"] as const).map((v) => (
                <button key={v} aria-pressed={p.sex === v} onClick={() => set("sex", v)}>
                  {v === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
          <Labeled label="Birth year">
            <NumberField value={p.birth_year} onChange={(v) => v && set("birth_year", v)} min={YEAR - 90} max={YEAR - 14} stepper={false} />
          </Labeled>
          <Labeled label="Height" hint={u === "imperial" ? `${Math.floor(p.height_cm / 30.48)}′ ${Math.round((p.height_cm / 2.54) % 12)}″` : undefined}>
            <NumberField value={p.height_cm} onChange={(v) => v && set("height_cm", v)} suffix="cm" stepper={false} />
          </Labeled>
          <Labeled label="Weight">
            <NumberField value={round(kgTo(p.weight_kg, u), 1)} onChange={(v) => v && set("weight_kg", toKg(v, u))} dp={1} suffix={wu} stepper={false} />
          </Labeled>
          <Labeled label="Body fat · optional" hint="A rough guess is fine; leave it blank if you don't know.">
            <NumberField value={p.body_fat} onChange={(v) => set("body_fat", v)} dp={1} suffix="%" stepper={false} placeholder="—" />
          </Labeled>
        </div>
      ),
    },
    { key: "goal", q: "What are you training for?", body: choice("goal", GOALS) },
    {
      key: "pace",
      q: "How fast should it go?",
      sub: "And, if you have one, the weight you're aiming for. Tally works out the timeline.",
      skip: (x) => x.goal === "recomp" || x.goal === "maintain",
      body: (
        <div className="space-y-8">
          {choice("pace", PACES)}
          <Labeled label="Goal weight · optional">
            <NumberField
              value={p.goal_weight_kg == null ? null : round(kgTo(p.goal_weight_kg, u), 1)}
              onChange={(v) => set("goal_weight_kg", v == null ? null : toKg(v, u))}
              dp={1}
              suffix={wu}
              stepper={false}
              placeholder="—"
              className="max-w-[240px]"
            />
          </Labeled>
        </div>
      ),
    },
    { key: "exp", q: "How long have you been lifting?", sub: "This sets your training volume and how you progress.", body: choice("experience", EXPERIENCE) },
    {
      key: "week",
      q: "What does your week allow?",
      body: (
        <div className="space-y-10">
          <div>
            <span className="label mb-3 block">Training days</span>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button key={d} className="choice !w-auto flex-1 justify-center !py-5" aria-pressed={p.days === d} onClick={() => set("days", d)}>
                  <span className="num display text-[34px] leading-none">{d}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label mb-3 block">Minutes per session</span>
            <div className="flex gap-2">
              {[45, 60, 75, 90].map((m) => (
                <button key={m} className="choice !w-auto flex-1 justify-center !py-4" aria-pressed={p.session_min === m} onClick={() => set("session_min", m)}>
                  <span className="num text-[18px] font-medium">{m}</span>
                  <span className="mono text-[10.5px] text-ink3">MIN</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    { key: "kit", q: "Where do you train?", body: choice("equipment", EQUIPMENT) },
    {
      key: "focus",
      q: "Anything to prioritise or protect?",
      sub: "Pick up to two areas to bring up, and any joints that need care. Both are optional.",
      body: (
        <div className="space-y-9">
          <div>
            <span className="label mb-3 block">Bring up · up to 2</span>
            {multi(p.focus, FOCUS, (v) => set("focus", toggle(p.focus, v)), 2)}
          </div>
          <div>
            <span className="label mb-3 block">Go easy on</span>
            {multi(p.limits, LIMITS, (v) => set("limits", toggle(p.limits, v)))}
          </div>
        </div>
      ),
    },
    { key: "life", q: "And outside the gym?", sub: "How active your day is sets the rest of your energy budget.", body: choice("lifestyle", LIFESTYLE) },
  ];
  const live = steps.filter((st) => !st.skip?.(p));
  const [i, setI] = useState(0);
  const review = i >= live.length;
  const preview = useData(() => (review ? api.coachPreview(p, YEAR) : Promise.resolve(null)), [review, JSON.stringify(p)]);
  const [saving, setSaving] = useState(false);

  const build = async () => {
    setSaving(true);
    const saved = await api.coachSave(p, YEAR, weekStart(today()));
    await applyTargets(saved.plan);
    const d = await api.getDay(today());
    if (d.metrics.weight_kg == null) await api.setMetrics(today(), { ...d.metrics, weight_kg: round(p.weight_kg, 1) });
    useStore.getState().bump();
    useStore.getState().notify("Plan built, and your targets are updated");
    onDone();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" && e.key !== "Enter") return;
      if (e.key === "Enter" && !e.metaKey) {
        e.preventDefault();
        if (!review) setI((x) => x + 1);
        else if (!saving) void build();
      }
      if (e.key === "Escape" && i > 0) setI((x) => x - 1);
      const step = live[i];
      const opts = step?.key === "goal" ? GOALS : step?.key === "exp" ? EXPERIENCE : step?.key === "kit" ? EQUIPMENT : step?.key === "life" ? LIFESTYLE : null;
      const k = e.key.toUpperCase().charCodeAt(0) - 65;
      if (opts && e.key.length === 1 && k >= 0 && k < opts.length) {
        const field = step.key === "goal" ? "goal" : step.key === "exp" ? "experience" : step.key === "kit" ? "equipment" : "lifestyle";
        set(field as keyof Profile, opts[k].value as never);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const step = live[Math.min(i, live.length - 1)];
  const total = live.length + 1;

  return (
    <div className="sheet grid min-h-[620px] grid-cols-12">
      <section className="cell col-span-4 flex flex-col !p-8">
        <span className="label">Program · intake</span>
        <div className="num display mt-6 text-[88px] leading-[0.85]">
          {String(Math.min(i + 1, total)).padStart(2, "0")}
          <span className="text-ink3 text-[40px]"> / {String(total).padStart(2, "0")}</span>
        </div>
        <ol className="mt-10 space-y-2.5">
          {[...live.map((x) => x.q), "Review your plan"].map((q, k) => (
            <li key={q}>
              <button
                className="flex w-full items-baseline gap-3 text-left text-[12.5px] transition-colors"
                style={{ color: k === i ? "var(--ink)" : k < i ? "var(--ink-2)" : "var(--ink-3)" }}
                disabled={k > i}
                onClick={() => setI(k)}
              >
                <span className="mono w-5 text-[10px]" style={{ color: k < i ? "var(--accent)" : undefined }}>
                  {k < i ? "✓" : String(k + 1).padStart(2, "0")}
                </span>
                {q}
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-auto pt-8 text-[11.5px] leading-relaxed text-ink3">
          Deterministic: the same answers always give the same plan. No AI involved; every number comes from a published formula or a written rule.
        </p>
      </section>

      <section className="cell col-span-8 flex flex-col !p-10">
        <div className="h-[2px] w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
          <div className="bar-grow h-full" style={{ width: `${(Math.min(i + 1, total) / total) * 100}%`, background: "var(--accent)" }} />
        </div>
        {!review ? (
          <div key={step.key} className="anim-rise mt-12 max-w-[620px]">
            <h2 className="display text-[40px] leading-[1.05]">{step.q}</h2>
            {step.sub && <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-ink2">{step.sub}</p>}
            <div className="mt-9">{step.body}</div>
          </div>
        ) : (
          <div className="anim-rise mt-12">
            <h2 className="display text-[40px] leading-[1.05]">Here's your plan.</h2>
            {preview && <PreviewSummary plan={preview} />}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-10">
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button className="btn -ml-3" onClick={() => setI(i - 1)}>
                ← Back
              </button>
            )}
            {onCancel && (
              <button className="btn" onClick={onCancel}>
                Keep current plan
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="mono text-[10.5px] text-ink3">
              {!review && ["goal", "exp", "kit", "life"].includes(step.key) ? "A–E TO PICK · " : ""}↵ {review ? "BUILD" : "NEXT"}
            </span>
            {review ? (
              <button className="btn btn-accent h-10 px-5" disabled={saving} onClick={() => void build()}>
                {saving ? "Building…" : "Build my plan"}
              </button>
            ) : (
              <button className="btn btn-primary h-10 px-5" onClick={() => setI(i + 1)}>
                Continue
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] text-ink3">{hint}</span>}
    </label>
  );
}

function PreviewSummary({ plan }: { plan: Plan }) {
  const n = plan.nutrition;
  const t = plan.training;
  return (
    <div className="mt-8 grid grid-cols-3 gap-8">
      <Big label="Calories" value={int(n.kcal)} unit="kcal / day" />
      <Big label="Protein · carbs · fat" value={`${int(n.protein)} · ${int(n.carbs)} · ${int(n.fat)}`} unit="g" />
      <Big label="Training" value={`${t.days_per_week}×`} unit={t.split} />
      <div className="col-span-3 space-y-2 border-t pt-6" style={{ borderColor: "var(--line)" }}>
        {plan.notes.slice(0, 4).map((x, k) => (
          <p key={k} className="grid grid-cols-[90px_1fr] gap-4 text-[13px] leading-relaxed">
            <span className="label pt-[3px]">{x.topic}</span>
            <span className="text-ink2">{x.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Big({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num display mt-2 whitespace-nowrap text-[30px] leading-none">{value}</div>
      <div className="mono mt-1.5 text-[10.5px] uppercase text-ink3">{unit}</div>
    </div>
  );
}

/** Push the plan's numbers into the targets every screen measures against. */
async function applyTargets(plan: Plan) {
  const n = plan.nutrition;
  const p = plan.profile;
  await useStore.getState().updateSettings({
    kcal: n.kcal,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: n.fiber,
    water_ml: n.water_ml,
    steps: n.steps,
    workouts_per_week: p.days,
    goal_weight_kg: p.goal_weight_kg,
    sex: p.sex,
    birth_year: p.birth_year,
    height_cm: p.height_cm,
    pace_kg_week: n.rate_kg_week,
  });
}

// ———————————————————————————————————————————————————————————— plan

function PlanView({ active, onRetake }: { active: ActivePlan; onRetake: () => void }) {
  const s = useSettings();
  const { plan, start_day } = active;
  const n = plan.nutrition;
  const t = plan.training;
  const day = today();
  const sv = useData(() => api.coachSession(day), [day]);
  const checkin = useData(() => api.coachCheckin(day), [day]);
  const todayIdx = (parseDay(day).getDay() + 6) % 7;
  const [picked, setPicked] = useState<number | null>(null);
  const todaySession = t.schedule[todayIdx];
  const isToday = picked == null && todaySession != null;
  // On a rest day, preview the next session rather than leaving the cell empty.
  const nextIdx = sv?.next ? t.sessions.findIndex((x) => x.name === sv.next![1]) : -1;
  const shownIdx = picked ?? todaySession ?? (nextIdx >= 0 ? nextIdx : null);
  const session: PlanSession | null = shownIdx == null ? null : isToday && sv?.session ? sv.session : t.sessions[shownIdx];
  const suggestions = isToday ? sv?.suggestions ?? [] : [];
  const applied = s.kcal === n.kcal && s.protein === n.protein && s.carbs === n.carbs && s.fat === n.fat;
  const wu = weightUnit(s.units);

  const start = () => {
    if (!session) return;
    const template: Workout = {
      id: 0,
      day,
      title: session.name,
      kind: "strength",
      duration_min: session.minutes,
      distance_km: null,
      kcal: null,
      effort: null,
      notes: "",
      created_at: 0,
      sets: session.exercises.flatMap((e, k) =>
        Array.from({ length: e.sets }, () => ({ exercise: e.name, reps: e.rep_low, weight_kg: suggestions[k]?.load_kg ?? null })),
      ),
    };
    useStore.getState().open({ type: "workout", day, template });
  };

  return (
    <div className="stagger sheet grid grid-cols-12">
      {/* Hero */}
      <section className="cell col-span-12 !px-8 !py-8">
        <div className="flex items-start justify-between gap-10">
          <div className="min-w-0">
            <div className="label">
              {GOAL_LABEL[plan.profile.goal]} · started {shortDate(start_day)} · {n.phase_weeks} week phase
            </div>
            <h2 className="display mt-4 text-[52px] leading-[0.95]">{t.split}</h2>
            <p className="mt-3 text-[14px] text-ink2">
              {t.days_per_week} days a week, {plan.profile.session_min} minutes each.
              {sv && (
                <>
                  {" "}
                  This is week <span className="text-ink">{sv.week_index + 1}</span> of {sv.block_len}:{" "}
                  <span className="text-ink">{sv.week.label.toLowerCase()}</span>
                  {sv.week.deload ? ", so go lighter this week." : `, stopping each set with about ${sv.week.rir} reps in reserve.`}
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <div className="flex gap-2">
              <button className="btn" onClick={onRetake}>
                Retake intake
              </button>
              <button className="btn btn-outline" disabled={applied} onClick={() => void applyTargets(plan).then(() => useStore.getState().notify("Targets updated from your plan"))}>
                {applied ? "Targets applied ✓" : "Apply targets"}
              </button>
            </div>
          </div>
        </div>
        <BlockStrip weeks={t.block} current={sv?.week_index ?? 0} />
      </section>

      {/* Session */}
      <section className="cell col-span-8 !px-8">
        <CardHead
          title={picked != null ? `${WEEKDAYS[t.schedule.indexOf(picked)]} · preview` : isToday ? "Today" : "Rest day · next session"}
          sub={session ? `${session.name}, ${session.focus.toLowerCase()} · about ${session.minutes} min` : undefined}
          right={
            isToday && session ? (
              <button className="btn btn-accent" onClick={start}>
                Start session →
              </button>
            ) : picked != null ? (
              <button className="btn btn-sm" onClick={() => setPicked(null)}>
                Back to today
              </button>
            ) : null
          }
        />
        {!isToday && picked == null ? (
          <p className="-mt-2 mb-5 text-[12.5px] text-ink3">
            {sv?.next ? `Nothing scheduled today. ${sv.next[1]} is on ${shortDate(sv.next[0])}:` : ""}
          </p>
        ) : null}
        {!session ? (
          <Empty title="Rest day.">
            {sv?.next ? `Next up: ${sv.next[1]} on ${shortDate(sv.next[0])}. Walk, sleep, eat your protein.` : "Walk, sleep, eat your protein."}
          </Empty>
        ) : null}
        {session && <SessionTable session={session} suggestions={suggestions} units={s.units} />}
        {session && <p className="mt-5 text-[12px] leading-relaxed text-ink3">Warm-up: {t.warmup}</p>}
      </section>

      {/* Nutrition */}
      <section className="cell col-span-4">
        <CardHead title="Fuel" sub={`${n.method} · maintenance ≈ ${int(n.tdee)} kcal`} />
        <Figure value={int(n.kcal)} unit="KCAL / DAY" size={44} />
        <div className="mono mt-3 flex gap-5 text-[10.5px] uppercase text-ink3">
          <span>Train {int(n.training_day_kcal)}</span>
          <span>Rest {int(n.rest_day_kcal)}</span>
        </div>
        <div className="mt-6 space-y-4">
          <MacroRow label="Protein" g={n.protein} kcal={n.kcal} per={4} color="var(--protein)" />
          <MacroRow label="Carbs" g={n.carbs} kcal={n.kcal} per={4} color="var(--carbs)" />
          <MacroRow label="Fat" g={n.fat} kcal={n.kcal} per={9} color="var(--fat)" />
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t pt-5" style={{ borderColor: "var(--line)" }}>
          <Mini label="Fibre" value={`${n.fiber} g`} />
          <Mini label="Water" value={fmtWater(n.water_ml, s.units)} />
          <Mini label="Steps" value={int(n.steps)} />
          <Mini label="Rate" value={`${n.rate_kg_week > 0 ? "+" : n.rate_kg_week < 0 ? "−" : "±"}${dec(Math.abs(kgTo(n.rate_kg_week, s.units)))} ${wu}/wk`} />
          <Mini label="BMI" value={dec(n.bmi)} />
          <Mini label="To goal" value={n.weeks_to_goal ? `${n.weeks_to_goal} wk` : "—"} />
        </dl>
      </section>

      {/* Week */}
      <section className="cell col-span-12 !px-8">
        <CardHead title="The week" sub="Click a day to preview its session." />
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[10px]" style={{ background: "var(--line)" }}>
          {WEEKDAYS.map((w, k) => {
            const si = t.schedule[k];
            const on = si != null && (picked != null ? picked === si && t.schedule.indexOf(si) === k : k === todayIdx);
            const d = addDays(weekStart(day), k);
            return (
              <button
                key={w}
                disabled={si == null}
                onClick={() => setPicked(k === todayIdx ? null : si)}
                className="flex min-h-[96px] flex-col items-start p-3.5 text-left transition-colors"
                style={{ background: on ? "var(--ink)" : "var(--surface-solid)", color: on ? "var(--surface-solid)" : undefined }}
              >
                <span className="mono flex w-full justify-between text-[10.5px] uppercase" style={{ opacity: 0.6 }}>
                  <span>{w}</span>
                  <span>{parseDay(d).getDate()}</span>
                </span>
                {si == null ? (
                  <span className="mt-auto text-[12.5px] opacity-40">Rest</span>
                ) : (
                  <>
                    <span className="mt-auto text-[14px] font-medium">{t.sessions[si].name}</span>
                    <span className="mono text-[10px] opacity-60">{t.sessions[si].minutes} MIN</span>
                  </>
                )}
                {k === todayIdx && <span className="mt-1 h-[3px] w-4 rounded-full" style={{ background: "var(--accent)" }} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Volume */}
      <section className="cell col-span-5">
        <CardHead title="Weekly sets" sub="Direct hard sets per muscle against the target for your level." />
        <div className="space-y-2.5">
          {t.volume.map((v) => (
            <div key={v.muscle} className="grid grid-cols-[92px_1fr_44px] items-center gap-3">
              <span className="text-[12.5px] text-ink2">{MUSCLE_LABEL[v.muscle]}</span>
              <div className="relative h-[6px] rounded-full" style={{ background: "var(--line)" }}>
                <div className="bar-grow absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(1, v.sets / 24) * 100}%`, background: v.sets >= v.target * 0.9 ? "var(--ink)" : "var(--ink-3)" }} />
                <div className="absolute -top-[3px] h-[12px] w-[1.5px]" style={{ left: `${Math.min(1, v.target / 24) * 100}%`, background: "var(--accent)" }} />
              </div>
              <span className="num mono text-right text-[11px] text-ink2">
                {v.sets}/{v.target}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Check-in */}
      <section className="cell col-span-7">
        <CardHead title="Check-in" sub="Every two weeks, compare the scale with the plan and adjust. Uses your weigh-ins and food log." />
        {checkin && <CheckinBlock c={checkin} wu={wu} units={s.units} />}
      </section>

      {/* Reasoning */}
      <section className="cell col-span-7">
        <CardHead title="Why these numbers" />
        <div className="space-y-3.5">
          {plan.notes.map((x, k) => (
            <p key={k} className="grid grid-cols-[84px_1fr] gap-4 text-[13px] leading-relaxed">
              <span className="label pt-[3px]">{x.topic}</span>
              <span className="text-ink2">{x.text}</span>
            </p>
          ))}
        </div>
      </section>
      <section className="cell col-span-5">
        <CardHead title="How to progress" />
        <ol className="space-y-3.5">
          {t.progression.map((x, k) => (
            <li key={k} className="grid grid-cols-[24px_1fr] text-[13px] leading-relaxed text-ink2">
              <span className="mono text-[10.5px] text-ink3">{String(k + 1).padStart(2, "0")}</span>
              {x}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function BlockStrip({ weeks, current }: { weeks: Plan["training"]["block"]; current: number }) {
  return (
    <div className="mt-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
      {weeks.map((w, k) => {
        const on = k === current;
        return (
          <div key={w.n}>
            <div
              className="h-[6px] rounded-full"
              style={{
                background: on ? "var(--accent)" : k < current ? "var(--ink-3)" : "var(--line-2)",
                backgroundImage: w.deload && !on ? "repeating-linear-gradient(135deg, transparent 0 3px, var(--surface-solid) 3px 5px)" : undefined,
              }}
            />
            <div className="mono mt-2.5 text-[10px] uppercase leading-relaxed" style={{ color: on ? "var(--ink)" : "var(--ink-3)" }}>
              <div>Week {w.n}</div>
              <div>
                {w.label} · {w.deload ? "light" : `RIR ${w.rir}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SessionTable({ session, suggestions, units }: { session: PlanSession; suggestions: Suggestion[]; units: "metric" | "imperial" }) {
  return (
    <div>
      <div className="label grid grid-cols-[28px_minmax(0,1fr)_84px_52px_56px_170px] gap-3 pb-2" style={{ boxShadow: "0 1px 0 var(--line)" }}>
        <span>#</span>
        <span>Exercise</span>
        <span>Sets × reps</span>
        <span>RIR</span>
        <span>Rest</span>
        <span>Load</span>
      </div>
      {session.exercises.map((e, k) => {
        const sg = suggestions[k];
        return (
          <div key={e.exercise_id + k} className="grid grid-cols-[28px_minmax(0,1fr)_84px_52px_56px_170px] items-start gap-3 py-3" style={{ boxShadow: "0 1px 0 var(--line)" }}>
            <span className="mono pt-[2px] text-[10.5px]" style={{ color: e.tier === 1 ? "var(--accent)" : "var(--ink-3)" }}>
              {String(k + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-medium">{e.name}</span>
              <span className="block text-[11.5px] text-ink3">
                {MUSCLE_LABEL[e.muscle]} · {e.tier === 1 ? "main lift" : e.tier === 2 ? "secondary" : "isolation"}
                {e.note && ` · ${e.note}`}
              </span>
            </span>
            <span className="num text-[14px]">
              {e.sets} × {e.rep_low}–{e.rep_high}
            </span>
            <span className="num text-[14px]">{e.rir}</span>
            <span className="num text-[13px] text-ink2">{e.rest_s >= 120 ? `${dec(e.rest_s / 60)}′` : `${e.rest_s}″`}</span>
            <span className="min-w-0">
              {sg ? (
                <>
                  <span className="num block text-[14px]">{sg.load_kg != null ? `${dec(kgTo(sg.load_kg, units))} ${weightUnit(units)}` : "—"}</span>
                  <span className="block text-[11px] leading-snug text-ink3">{sg.reason}</span>
                </>
              ) : (
                <span className="text-[12px] text-ink3">{e.step_kg ? `+${dec(kgTo(e.step_kg, units))} ${weightUnit(units)} steps` : "Bodyweight"}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MacroRow({ label, g, kcal, per, color }: { label: string; g: number; kcal: number; per: number; color: string }) {
  const share = (g * per) / (kcal || 1);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-[12.5px] text-ink2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="num text-[14px]">
          {int(g)}
          <span className="mono ml-1 text-[10.5px] text-ink3">G · {Math.round(share * 100)}%</span>
        </span>
      </div>
      <Meter value={share} max={0.6} color={color} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="num mt-1 text-[14px]">{value}</dd>
    </div>
  );
}

function CheckinBlock({ c, wu, units }: { c: NonNullable<Awaited<ReturnType<typeof api.coachCheckin>>>; wu: string; units: "metric" | "imperial" }) {
  const update = useStore((x) => x.updateSettings);
  const s = useSettings();
  const rate = (r: number | null) => (r == null ? "—" : `${r >= 0 ? "+" : "−"}${dec(Math.abs(kgTo(r, units)))} ${wu}/wk`);
  const color = c.status === "on_track" ? "var(--good)" : c.status === "not_enough_data" ? "var(--ink-3)" : "var(--warn)";
  const stats = useMemo(
    () => [
      ["Trend", c.trend_kg != null ? `${dec(kgTo(c.trend_kg, units))} ${wu}` : "—"],
      ["Moving", rate(c.actual_rate)],
      ["Target", rate(c.target_rate)],
      ["Avg intake", c.avg_intake != null ? `${int(c.avg_intake)} kcal` : "—"],
      ["Real maintenance", c.observed_tdee != null ? `${int(c.observed_tdee)} kcal` : "—"],
      ["Weigh-ins", `${c.weigh_ins} / ${c.window_days}d`],
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c, units],
  );
  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="title text-[20px]">{c.headline}</span>
          </div>
          <p className="mt-2 max-w-[460px] text-[13px] leading-relaxed text-ink2">{c.detail}</p>
        </div>
        {c.change_kcal !== 0 && (
          <button
            className="btn btn-primary shrink-0"
            onClick={() =>
              void update({ kcal: c.new_kcal, carbs: Math.max(0, Math.round((s.carbs + c.change_kcal / 4) / 5) * 5) }).then(() =>
                useStore.getState().notify(`Calories set to ${int(c.new_kcal)}. Carbs absorb the change`),
              )
            }
          >
            Set {int(c.new_kcal)} kcal
          </button>
        )}
      </div>
      <dl className="mt-6 grid grid-cols-6 gap-4 border-t pt-5" style={{ borderColor: "var(--line)" }}>
        {stats.map(([l, v]) => (
          <Mini key={l} label={l} value={v} />
        ))}
      </dl>
    </div>
  );
}
