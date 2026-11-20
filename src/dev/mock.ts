/**
 * Dev-only stand-in for the Rust commands, so the UI can be opened in a
 * plain browser (`npm run dev`). In-memory, seeded with ~10 weeks of data.
 * Never bundled into the app: imported only when not running under Tauri.
 */
import type { ActivePlan, DayMetrics, DayStat, Entry, Food, Plan, Settings, Workout } from "../api";
import { addDays, diffDays, parseDay, today } from "../lib/date";
import samplePlan from "./sample-plan.json";
import sampleMeals from "./sample-meals.json";

// The real planner runs in Rust; the mock serves one plan it generated.
const plan = samplePlan as unknown as Plan;
let active: ActivePlan | null = null;

let seq = 1000;
const now = () => Date.now();

const settings: { v: Settings | null } = { v: null };
const foods: (Food & { archived?: boolean })[] = [];
const entries: Entry[] = [];
const workouts: Workout[] = [];
const days = new Map<string, DayMetrics>();

const F = (name: string, serving: string, kcal: number, protein: number, carbs: number, fat: number, fiber = 0): Food => ({
  id: seq++, name, serving, kcal, protein, carbs, fat, fiber, favorite: false, use_count: 0, last_used_at: null,
});

function seed() {
  foods.push(
    F("Egg, large", "1 egg (50 g)", 72, 6.3, 0.4, 4.8),
    F("Greek yogurt, plain nonfat", "170 g", 100, 17, 6, 0.7),
    F("Oats, rolled (dry)", "40 g", 152, 5.3, 27, 2.6, 4),
    F("Banana", "1 medium (118 g)", 105, 1.3, 27, 0.4, 3.1),
    F("Chicken breast, cooked", "100 g", 165, 31, 0, 3.6),
    F("White rice, cooked", "1 cup (158 g)", 205, 4.3, 44.5, 0.4, 0.6),
    F("Roti / chapati", "1 medium (40 g)", 120, 3.1, 18, 3.7, 1.9),
    F("Dal, cooked", "1 cup (240 g)", 260, 13, 34, 8, 9),
    F("Paneer", "100 g", 265, 18.3, 1.2, 20.8),
    F("Whey protein", "1 scoop (30 g)", 120, 24, 3, 1.5),
    F("Almonds", "28 g", 164, 6, 6.1, 14.2, 3.5),
    F("Salmon, cooked", "100 g", 206, 22, 0, 12),
    F("Broccoli", "1 cup (91 g)", 31, 2.5, 6, 0.3, 2.4),
    F("Apple", "1 medium (182 g)", 95, 0.5, 25, 0.3, 4.4),
    F("Peanut butter", "2 tbsp (32 g)", 188, 8, 6.3, 16, 1.9),
    F("Coffee, black", "1 cup (240 ml)", 2, 0.3, 0, 0),
  );
  foods[0].favorite = foods[9].favorite = true;
  const t = today();
  let rnd = 7;
  const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const plan: [Entry["meal"], number[]][] = [
    ["breakfast", [0, 0, 2, 3, 15]],
    ["lunch", [4, 5, 12]],
    ["dinner", [6, 6, 7, 8]],
    ["snack", [9, 10, 13]],
  ];
  let w = 82.4;
  for (let i = 70; i >= 0; i--) {
    const d = addDays(t, -i);
    if (i > 0 && r() < 0.08) continue;
    for (const [meal, ids] of plan) {
      for (const k of ids) {
        if (i === 0 && meal !== "breakfast" && meal !== "lunch") continue;
        if (r() < 0.15) continue;
        const f = foods[k];
        entries.push({ id: seq++, day: d, meal, food_id: f.id, name: f.name, serving: f.serving, qty: r() < 0.2 ? 1.5 : 1, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, created_at: now() - i * 864e5 });
        f.use_count++;
        f.last_used_at = now() - i * 864e5;
      }
    }
    w += (r() - 0.56) * 0.35;
    days.set(d, {
      water_ml: i === 0 ? 1250 : 1500 + Math.round(r() * 6) * 250,
      steps: i === 0 ? 4210 : Math.round(5000 + r() * 7000),
      sleep_h: Math.round((6 + r() * 2.5) * 4) / 4,
      weight_kg: r() < 0.8 ? Math.round((w + (r() - 0.5) * 0.6) * 10) / 10 : null,
      body_fat: null,
      energy: i === 0 ? null : 2 + Math.floor(r() * 4),
      note: null,
    });
    const dow = new Date(d).getDay();
    if (i > 0 && [1, 3, 5].includes(dow)) {
      const push = dow !== 3;
      const prog = (70 - i) * 0.12;
      workouts.push({
        id: seq++, day: d, title: push ? "Push day" : "Legs", kind: "strength", duration_min: 55 + Math.round(r() * 15),
        distance_km: null, kcal: 320 + Math.round(r() * 80), effort: 6 + Math.floor(r() * 3), notes: "", created_at: now() - i * 864e5,
        sets: push
          ? [0, 1, 2].map(() => ({ exercise: "Bench press", reps: 6 + Math.floor(r() * 3), weight_kg: Math.round((70 + prog) / 2.5) * 2.5 }))
              .concat([0, 1, 2].map(() => ({ exercise: "Overhead press", reps: 8, weight_kg: Math.round((40 + prog / 2) / 2.5) * 2.5 })))
          : [0, 1, 2, 3].map(() => ({ exercise: "Back squat", reps: 5, weight_kg: Math.round((100 + prog * 1.4) / 2.5) * 2.5 })),
      });
    }
    if (i > 0 && dow === 6) {
      workouts.push({ id: seq++, day: d, title: "Easy run", kind: "run", duration_min: 32, distance_km: 5.2, kcal: 380, effort: 4, notes: "", created_at: now() - i * 864e5, sets: [] });
    }
  }
}

function epley(w: number, r: number) {
  return r <= 1 ? w : w * (1 + r / 30);
}

function rangeStats(from: string, to: string): DayStat[] {
  const m = new Map<string, DayStat>();
  const get = (day: string) => {
    if (!m.has(day)) m.set(day, { day, entries: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, workouts: 0, minutes: 0, burned: 0, volume: 0, water_ml: null, steps: null, sleep_h: null, weight_kg: null, body_fat: null, energy: null });
    return m.get(day)!;
  };
  for (const e of entries) if (e.day >= from && e.day <= to) {
    const s = get(e.day);
    s.entries++, (s.kcal += e.kcal * e.qty), (s.protein += e.protein * e.qty), (s.carbs += e.carbs * e.qty), (s.fat += e.fat * e.qty), (s.fiber += e.fiber * e.qty);
  }
  for (const w of workouts) if (w.day >= from && w.day <= to) {
    const s = get(w.day);
    s.workouts++, (s.minutes += w.duration_min), (s.burned += w.kcal ?? 0), (s.volume += w.sets.reduce((a, x) => a + (x.reps ?? 0) * (x.weight_kg ?? 0), 0));
  }
  for (const [d, x] of days) if (d >= from && d <= to && (x.water_ml ?? x.steps ?? x.sleep_h ?? x.weight_kg) != null) Object.assign(get(d), { water_ml: x.water_ml, steps: x.steps, sleep_h: x.sleep_h, weight_kg: x.weight_kg, body_fat: x.body_fat, energy: x.energy });
  return [...m.values()].sort((a, b) => a.day.localeCompare(b.day));
}

const empty = (): DayMetrics => ({ water_ml: null, steps: null, sleep_h: null, weight_kg: null, body_fat: null, energy: null, note: null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<string, (a: any) => unknown> = {
  get_settings: () => settings.v,
  save_settings: ({ settings: s }) => (settings.v = s),
  search_foods: ({ query, limit = 40 }) => {
    const ws = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    return foods
      .filter((f) => !f.archived && ws.every((w) => f.name.toLowerCase().includes(w)))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.last_used_at ?? 0) - (a.last_used_at ?? 0) || a.name.localeCompare(b.name))
      .slice(0, limit);
  },
  save_food: ({ food }) => {
    const ex = foods.find((f) => f.id === food.id);
    if (ex) return Object.assign(ex, food);
    const f = { ...F(food.name, food.serving, food.kcal, food.protein, food.carbs, food.fat, food.fiber) };
    foods.push(f);
    return f;
  },
  delete_food: ({ id }) => void (foods.find((f) => f.id === id)!.archived = true),
  toggle_favorite: ({ id }) => {
    const f = foods.find((x) => x.id === id)!;
    return (f.favorite = !f.favorite);
  },
  add_entry: ({ entry }) => {
    let food_id = entry.food_id;
    if (food_id == null && entry.save_food) food_id = (handlers.save_food({ food: entry }) as Food).id;
    const f = foods.find((x) => x.id === food_id);
    if (f) f.use_count++, (f.last_used_at = now());
    const e: Entry = { id: seq++, day: entry.day, meal: entry.meal, food_id, name: entry.name, serving: entry.serving, qty: entry.qty, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat, fiber: entry.fiber ?? 0, created_at: now() };
    entries.push(e);
    return e;
  },
  edit_entry: ({ id, edit, updateFood }) => {
    const e = entries.find((x) => x.id === id)!;
    Object.assign(e, edit);
    const f = foods.find((x) => x.id === e.food_id);
    if (updateFood && f) Object.assign(f, { name: edit.name, serving: edit.serving, kcal: edit.kcal, protein: edit.protein, carbs: edit.carbs, fat: edit.fat, fiber: edit.fiber });
    return e;
  },
  update_entry: ({ id, qty, meal }) => void Object.assign(entries.find((e) => e.id === id)!, { qty, meal }),
  delete_entry: ({ id }) => void entries.splice(entries.findIndex((e) => e.id === id), 1),
  copy_meal: ({ fromDay, toDay, meal }) => {
    const src = entries.filter((e) => e.day === fromDay && e.meal === meal);
    for (const e of src) entries.push({ ...e, id: seq++, day: toDay, created_at: now() });
    return src.length;
  },
  save_workout: ({ workout }) => {
    const i = workouts.findIndex((w) => w.id === workout.id);
    const w = { ...workout, id: workout.id ?? seq++, created_at: i >= 0 ? workouts[i].created_at : now() };
    if (i >= 0) workouts[i] = w;
    else workouts.push(w);
    return w.id;
  },
  delete_workout: ({ id }) => void workouts.splice(workouts.findIndex((w) => w.id === id), 1),
  list_workouts: ({ from, to }) => workouts.filter((w) => w.day >= from && w.day <= to).sort((a, b) => b.day.localeCompare(a.day)),
  recent_workouts: ({ limit = 6 }) => {
    const seen = new Set<string>();
    return [...workouts].reverse().filter((w) => !seen.has(w.title) && seen.add(w.title)).slice(0, limit);
  },
  exercise_names: () => [...new Set(workouts.flatMap((w) => w.sets.map((s) => s.exercise)))],
  exercise_history: ({ exercise }) => {
    const m = new Map<string, { day: string; sets: number; reps: number; volume: number; top_weight: number; e1rm: number }>();
    for (const w of [...workouts].sort((a, b) => a.day.localeCompare(b.day)))
      for (const s of w.sets) if (s.exercise.toLowerCase() === String(exercise).toLowerCase()) {
        const p = m.get(w.day) ?? { day: w.day, sets: 0, reps: 0, volume: 0, top_weight: 0, e1rm: 0 };
        p.sets++, (p.reps += s.reps ?? 0), (p.volume += (s.reps ?? 0) * (s.weight_kg ?? 0));
        p.top_weight = Math.max(p.top_weight, s.weight_kg ?? 0);
        p.e1rm = Math.max(p.e1rm, epley(s.weight_kg ?? 0, s.reps ?? 0));
        m.set(w.day, p);
      }
    return [...m.values()];
  },
  exercise_summaries: () => {
    const m = new Map<string, { exercise: string; days: Set<string>; last_day: string; top_weight: number; e1rm: number }>();
    for (const w of workouts) for (const s of w.sets) {
      const k = s.exercise.toLowerCase();
      const e = m.get(k) ?? { exercise: s.exercise, days: new Set(), last_day: "", top_weight: 0, e1rm: 0 };
      e.days.add(w.day);
      if (w.day > e.last_day) e.last_day = w.day;
      e.top_weight = Math.max(e.top_weight, s.weight_kg ?? 0);
      e.e1rm = Math.max(e.e1rm, epley(s.weight_kg ?? 0, s.reps ?? 0));
      m.set(k, e);
    }
    return [...m.values()].map(({ days: d, ...x }) => ({ ...x, sessions: d.size })).sort((a, b) => b.last_day.localeCompare(a.last_day));
  },
  set_metrics: ({ day, metrics }) => void days.set(day, metrics),
  get_day: ({ day }) => ({
    day,
    entries: entries.filter((e) => e.day === day),
    workouts: workouts.filter((w) => w.day === day),
    metrics: days.get(day) ?? empty(),
  }),
  range_stats: ({ from, to }) => rangeStats(from, to),
  weight_series: () => [...days.entries()].filter(([, m]) => m.weight_kg != null).sort(([a], [b]) => a.localeCompare(b)).map(([d, m]) => [d, m.weight_kg]),
  logged_days: () => [...new Set([...entries.map((e) => e.day), ...workouts.map((w) => w.day), ...days.keys()])].sort(),
  // The real scorer runs in Rust; the mock serves its output per meal.
  recommend_meals: ({ slot, quick }) => {
    const m = (sampleMeals as Record<string, { suggestions: { minutes: number }[] }>)[slot];
    return { ...m, diet: settings.v!.diet, suggestions: m.suggestions.filter((x) => !quick || x.minutes <= 10) };
  },
  recipe_for: ({ name }) => {
    type S = { id: string; name: string; kind: string; serving: string; minutes: number; portion: number; kcal: number; protein: number; carbs: number; fat: number; fiber: number; ingredients: unknown; steps: unknown };
    const all = Object.values(sampleMeals as unknown as Record<string, { suggestions: S[] }>).flatMap((m) => m.suggestions);
    const r = all.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
    if (!r) return null;
    const per = (v: number) => Math.round((v / r.portion) * 10) / 10;
    return { id: r.id, name: r.name, kind: r.kind, serving: r.serving, minutes: r.minutes, kcal: per(r.kcal), protein: per(r.protein), carbs: per(r.carbs), fat: per(r.fat), fiber: per(r.fiber), ingredients: r.ingredients, steps: r.steps };
  },
  log_recipe: ({ day, meal, recipeId, portion }) => {
    const all = Object.values(sampleMeals as Record<string, { suggestions: { id: string; name: string; portion: number; kcal: number; protein: number; carbs: number; fat: number; fiber: number }[] }>).flatMap((m) => m.suggestions);
    const r = all.find((x) => x.id === recipeId)!;
    const per = (v: number) => v / r.portion;
    return handlers.add_entry({ entry: { day, meal, food_id: null, name: r.name, serving: "1 portion", qty: portion, kcal: per(r.kcal), protein: per(r.protein), carbs: per(r.carbs), fat: per(r.fat), fiber: per(r.fiber), save_food: false } });
  },
  coach_preview: () => plan,
  coach_save: ({ startDay }) => (active = { id: 2, start_day: startDay, created_at: now(), plan }),
  coach_active: () => active,
  coach_clear: () => void (active = null),
  coach_session: ({ day }) => {
    if (!active) return null;
    const t = plan.training;
    const wi = Math.floor(Math.max(0, diffDays(day, active.start_day)) / 7) % t.block.length;
    const week = t.block[wi];
    const wd = (parseDay(day).getDay() + 6) % 7;
    const si = t.schedule[wd];
    const session = si == null ? null : { ...t.sessions[si], exercises: t.sessions[si].exercises.map((e) => ({ ...e, sets: Math.max(1, Math.round((e.sets * week.volume_pct) / 100)), rir: week.deload ? 4 : e.tier === 3 ? Math.max(0, week.rir - 1) : week.rir })) };
    const suggestions = (session?.exercises ?? []).map((e) => {
      const past = workouts.filter((w) => w.day < day && w.sets.some((x) => x.exercise.toLowerCase() === e.name.toLowerCase())).sort((a, b) => b.day.localeCompare(a.day))[0];
      if (!past) return { last_day: null, last_sets: [], load_kg: null, reason: e.step_kg ? "First time: pick a load you could lift for a few more reps than the top of the range." : "Bodyweight: aim for the rep range." };
      const sets = past.sets.filter((x) => x.exercise.toLowerCase() === e.name.toLowerCase());
      const top = Math.max(...sets.map((x) => x.weight_kg ?? 0));
      const hit = sets.every((x) => (x.reps ?? 0) >= e.rep_high);
      return { last_day: past.day, last_sets: sets.map((x) => [x.reps, x.weight_kg]), load_kg: hit ? top + e.step_kg : top, reason: hit ? `You hit ${e.rep_high} reps on every set: add ${e.step_kg} kg.` : "Same load, add a rep or two." };
    });
    let next: [string, string] | null = null;
    for (let k = 1; k <= 7 && !next; k++) {
      const d = addDays(day, k);
      const i = t.schedule[(parseDay(d).getDay() + 6) % 7];
      if (i != null) next = [d, t.sessions[i].name];
    }
    return { week, week_index: wi, block_len: t.block.length, session_index: si, session, suggestions, next };
  },
  coach_checkin: () =>
    active && {
      status: "too_slow", weigh_ins: 17, window_days: 21, trend_kg: 80.9, actual_rate: 0.04, target_rate: plan.nutrition.rate_kg_week,
      intake_days: 12, avg_intake: 2610, observed_tdee: 2560, current_kcal: settings.v!.kcal, change_kcal: 100, new_kcal: settings.v!.kcal + 100,
      headline: "Add 100 kcal a day", detail: `Your trend is moving +0.04 kg/week against a target of +${plan.nutrition.rate_kg_week} kg/week. Going from ${settings.v!.kcal} to ${settings.v!.kcal + 100} kcal should close most of the gap; check again in two weeks.`,
    },
  data_path: () => "~/Library/Application Support/app.tally.desktop/tally.db (browser mock)",
  export_data: () => "~/Downloads/tally-export.json",
  reveal_path: () => undefined,
};

export function installMock(defaults: Settings) {
  if (seeded) return call;
  seeded = true;
  if (!location.hash.includes("noplan")) active = { id: 1, start_day: addDays(today(), -9), created_at: now(), plan };
  settings.v = { ...defaults, onboarded: !location.hash.includes("welcome"), name: "Nishant", goal_weight_kg: 78, birth_year: 1996, height_cm: 178 };
  if (!location.hash.includes("empty")) seed();
  return call;
}

let seeded = false;

async function call(cmd: string, args: Record<string, unknown> = {}) {
  await new Promise((r) => setTimeout(r, 8));
  const h = handlers[cmd];
  if (!h) throw new Error(`mock: no handler for ${cmd}`);
  return structuredClone(h(args));
}
