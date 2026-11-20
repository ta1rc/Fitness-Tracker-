import type { Settings } from "../api";

/** Mifflin–St Jeor resting energy, kcal/day. */
export function bmr(s: Settings, weightKg: number): number | null {
  if (!s.height_cm || !s.birth_year) return null;
  const age = new Date().getFullYear() - s.birth_year;
  const base = 10 * weightKg + 6.25 * s.height_cm - 5 * age;
  return s.sex === "male" ? base + 5 : base - 161;
}

export const ACTIVITY = [
  { v: 1.2, label: "Desk-bound", hint: "Little walking, no training" },
  { v: 1.375, label: "Light", hint: "Train 1–3 days a week" },
  { v: 1.45, label: "Moderate", hint: "Train 3–4 days, some walking" },
  { v: 1.55, label: "Active", hint: "Train 4–5 days" },
  { v: 1.725, label: "Very active", hint: "Hard training most days" },
];

/** ~7700 kcal per kg of body mass. */
const KCAL_PER_KG = 7700;

export type Plan = { bmr: number; tdee: number; kcal: number; protein: number; fat: number; carbs: number };

/**
 * Targets from profile + current weight. Protein 1.8 g/kg (2.0 when cutting),
 * fat 0.8 g/kg, carbs fill the rest.
 */
export function suggestPlan(s: Settings, weightKg: number): Plan | null {
  const b = bmr(s, weightKg);
  if (b == null) return null;
  const tdee = b * s.activity;
  const kcal = Math.max(1200, tdee + (s.pace_kg_week * KCAL_PER_KG) / 7);
  const protein = weightKg * (s.pace_kg_week < 0 ? 2.0 : 1.8);
  const fat = weightKg * 0.8;
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  const r5 = (v: number) => Math.round(v / 5) * 5;
  return { bmr: Math.round(b), tdee: Math.round(tdee), kcal: Math.round(kcal / 10) * 10, protein: r5(protein), fat: r5(fat), carbs: r5(carbs) };
}

/** Exponentially weighted trend: smooths day-to-day water noise in weigh-ins. */
export function trend(series: [string, number][], alpha = 0.1): [string, number][] {
  let t: number | null = null;
  return series.map(([d, v]) => {
    t = t == null ? v : t + alpha * (v - t);
    return [d, t];
  });
}
