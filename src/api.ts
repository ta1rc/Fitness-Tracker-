import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
export const MEAL_LABEL: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

export type Settings = {
  name: string;
  units: "metric" | "imperial";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water_ml: number;
  steps: number;
  sleep_h: number;
  workouts_per_week: number;
  goal_weight_kg: number | null;
  sex: "male" | "female";
  birth_year: number | null;
  height_cm: number | null;
  activity: number;
  pace_kg_week: number;
  onboarded: boolean;
  scene: string;
  reactive: boolean;
  diet: Diet;
};

export type Diet = "any" | "pescatarian" | "eggetarian" | "vegetarian" | "vegan";
export type DishKind = "vegan" | "vegetarian" | "egg" | "fish" | "meat";
export type Ingredient = { qty: number; unit: string; item: string };
export type Recipe = Macros & { id: string; name: string; kind: DishKind; serving: string; minutes: number; ingredients: Ingredient[]; steps: string[] };
export type MealSuggestion = {
  id: string;
  name: string;
  kind: DishKind;
  serving: string;
  ingredients: Ingredient[];
  steps: string[];
  minutes: number;
  portion: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  score: number;
  reasons: string[];
};
export type MealSuggestions = {
  budget: { slot: Meal; kcal: number; protein: number; kcal_left: number; protein_left: number; over: boolean };
  diet: Diet;
  goal: Goal;
  suggestions: MealSuggestion[];
};

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export type Food = Macros & {
  id: number;
  name: string;
  serving: string;
  favorite: boolean;
  use_count: number;
  last_used_at: number | null;
};

export type FoodInput = Macros & { id: number | null; name: string; serving: string };

export type Entry = Macros & {
  id: number;
  day: string;
  meal: Meal;
  food_id: number | null;
  name: string;
  serving: string;
  qty: number;
  created_at: number;
};

/** Per-serving values plus amount; the entry's totals are values × qty. */
export type EntryEdit = Macros & { name: string; serving: string; meal: Meal; qty: number };

export type EntryInput = Macros & {
  day: string;
  meal: Meal;
  food_id: number | null;
  name: string;
  serving: string;
  qty: number;
  save_food: boolean;
};

export type WorkoutKind = "strength" | "run" | "ride" | "walk" | "swim" | "hiit" | "yoga" | "sport" | "other";
export const KINDS: { id: WorkoutKind; label: string; cardio: boolean }[] = [
  { id: "strength", label: "Strength", cardio: false },
  { id: "run", label: "Run", cardio: true },
  { id: "ride", label: "Ride", cardio: true },
  { id: "walk", label: "Walk", cardio: true },
  { id: "swim", label: "Swim", cardio: true },
  { id: "hiit", label: "HIIT", cardio: false },
  { id: "yoga", label: "Yoga", cardio: false },
  { id: "sport", label: "Sport", cardio: false },
  { id: "other", label: "Other", cardio: false },
];
export const kindLabel = (k: string) => KINDS.find((x) => x.id === k)?.label ?? k;

export type WorkSet = { exercise: string; reps: number | null; weight_kg: number | null };

export type Workout = {
  id: number;
  day: string;
  title: string;
  kind: WorkoutKind;
  duration_min: number;
  distance_km: number | null;
  kcal: number | null;
  effort: number | null;
  notes: string;
  created_at: number;
  sets: WorkSet[];
};

export type WorkoutInput = Omit<Workout, "id" | "created_at"> & { id: number | null };

export type DayMetrics = {
  water_ml: number | null;
  steps: number | null;
  sleep_h: number | null;
  weight_kg: number | null;
  body_fat: number | null;
  energy: number | null;
  note: string | null;
};

export type DayView = { day: string; entries: Entry[]; workouts: Workout[]; metrics: DayMetrics };

export type DayStat = {
  day: string;
  entries: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  workouts: number;
  minutes: number;
  burned: number;
  volume: number;
  water_ml: number | null;
  steps: number | null;
  sleep_h: number | null;
  weight_kg: number | null;
  body_fat: number | null;
  energy: number | null;
};

export type ExercisePoint = { day: string; sets: number; reps: number; volume: number; top_weight: number; e1rm: number };
export type ExerciseSummary = { exercise: string; sessions: number; last_day: string; top_weight: number; e1rm: number };

// ———————————————————————————————————————————————————————————— coach

export type Goal = "cut" | "recomp" | "lean_bulk" | "strength" | "maintain";
export type Pace = "gentle" | "standard" | "aggressive";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Equipment = "gym" | "dumbbell" | "home";
export type Lifestyle = "desk" | "on_feet" | "manual";
export type Limit = "knee" | "lower_back" | "shoulder";
export type FocusArea = "chest" | "back" | "shoulders" | "arms" | "quads" | "hamstrings" | "glutes" | "calves" | "abs";
export type Muscle = "chest" | "back" | "shoulders" | "rear_delts" | "biceps" | "triceps" | "quads" | "hamstrings" | "glutes" | "calves" | "abs";

export type Profile = {
  sex: "male" | "female";
  birth_year: number;
  height_cm: number;
  weight_kg: number;
  body_fat: number | null;
  goal: Goal;
  pace: Pace;
  goal_weight_kg: number | null;
  experience: Experience;
  days: number;
  session_min: number;
  equipment: Equipment;
  focus: FocusArea[];
  limits: Limit[];
  lifestyle: Lifestyle;
};

export type Prescription = {
  exercise_id: string;
  name: string;
  pattern: string;
  muscle: Muscle;
  tier: 1 | 2 | 3;
  sets: number;
  rep_low: number;
  rep_high: number;
  rir: number;
  rest_s: number;
  step_kg: number;
  note: string | null;
};
export type PlanSession = { key: string; name: string; focus: string; minutes: number; exercises: Prescription[] };
export type PlanWeek = { n: number; label: string; rir: number; volume_pct: number; deload: boolean };
export type Plan = {
  version: number;
  year: number;
  profile: Profile;
  nutrition: {
    method: string;
    bmi: number;
    lean_mass_kg: number | null;
    bmr: number;
    activity_factor: number;
    training_kcal: number;
    tdee: number;
    rate_kg_week: number;
    kcal: number;
    training_day_kcal: number;
    rest_day_kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    water_ml: number;
    steps: number;
    phase_weeks: number;
    weeks_to_goal: number | null;
  };
  training: {
    split: string;
    days_per_week: number;
    schedule: (number | null)[];
    sessions: PlanSession[];
    volume: { muscle: Muscle; sets: number; target: number }[];
    block: PlanWeek[];
    progression: string[];
    warmup: string;
  };
  notes: { topic: string; text: string }[];
};
export type ActivePlan = { id: number; start_day: string; created_at: number; plan: Plan };
export type Suggestion = { last_day: string | null; last_sets: [number | null, number | null][]; load_kg: number | null; reason: string };
export type SessionView = {
  week: PlanWeek;
  week_index: number;
  block_len: number;
  session_index: number | null;
  session: PlanSession | null;
  suggestions: Suggestion[];
  next: [string, string] | null;
};
export type Checkin = {
  status: "not_enough_data" | "on_track" | "too_fast" | "too_slow";
  weigh_ins: number;
  window_days: number;
  trend_kg: number | null;
  actual_rate: number | null;
  target_rate: number;
  intake_days: number;
  avg_intake: number | null;
  observed_tdee: number | null;
  current_kcal: number;
  change_kcal: number;
  new_kcal: number;
  headline: string;
  detail: string;
};

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", rear_delts: "Rear delts", biceps: "Biceps", triceps: "Triceps",
  quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves", abs: "Abs",
};
export const GOAL_LABEL: Record<Goal, string> = { cut: "Cut", recomp: "Recomp", lean_bulk: "Lean bulk", strength: "Strength", maintain: "Maintain" };

export const isTauri = "__TAURI_INTERNALS__" in window;

const DEFAULT_SETTINGS: Settings = {
  name: "", units: "metric", kcal: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30, water_ml: 2500, steps: 8000,
  sleep_h: 8, workouts_per_week: 4, goal_weight_kg: null, sex: "male", birth_year: null, height_cm: null,
  activity: 1.45, pace_kg_week: -0.25, onboarded: false, scene: "auto", reactive: true, diet: "any",
};

type Call = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
let invoke: Call = tauriInvoke;

/** Under Tauri, the Rust backend. In a dev browser tab, an in-memory mock. */
export async function initBackend(): Promise<boolean> {
  if (isTauri) return true;
  if (!import.meta.env.DEV) return false;
  const { installMock } = await import("./dev/mock");
  invoke = installMock(DEFAULT_SETTINGS) as Call;
  return true;
}

export const api = {
  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) => invoke<Settings>("save_settings", { settings }),

  searchFoods: (query: string, limit?: number) => invoke<Food[]>("search_foods", { query, limit }),
  saveFood: (food: FoodInput) => invoke<Food>("save_food", { food }),
  deleteFood: (id: number) => invoke<void>("delete_food", { id }),
  toggleFavorite: (id: number) => invoke<boolean>("toggle_favorite", { id }),

  addEntry: (entry: EntryInput) => invoke<Entry>("add_entry", { entry }),
  updateEntry: (id: number, qty: number, meal: Meal) => invoke<void>("update_entry", { id, qty, meal }),
  editEntry: (id: number, edit: EntryEdit, updateFood: boolean) => invoke<Entry>("edit_entry", { id, edit, updateFood }),
  deleteEntry: (id: number) => invoke<void>("delete_entry", { id }),
  copyMeal: (fromDay: string, toDay: string, meal: Meal) => invoke<number>("copy_meal", { fromDay, toDay, meal }),

  saveWorkout: (workout: WorkoutInput) => invoke<number>("save_workout", { workout }),
  deleteWorkout: (id: number) => invoke<void>("delete_workout", { id }),
  listWorkouts: (from: string, to: string) => invoke<Workout[]>("list_workouts", { from, to }),
  recentWorkouts: (limit?: number) => invoke<Workout[]>("recent_workouts", { limit }),
  exerciseNames: () => invoke<string[]>("exercise_names"),
  exerciseHistory: (exercise: string) => invoke<ExercisePoint[]>("exercise_history", { exercise }),
  exerciseSummaries: () => invoke<ExerciseSummary[]>("exercise_summaries"),

  setMetrics: (day: string, metrics: DayMetrics) => invoke<void>("set_metrics", { day, metrics }),
  getDay: (day: string) => invoke<DayView>("get_day", { day }),
  rangeStats: (from: string, to: string) => invoke<DayStat[]>("range_stats", { from, to }),
  weightSeries: () => invoke<[string, number][]>("weight_series"),
  loggedDays: () => invoke<string[]>("logged_days"),

  dataPath: () => invoke<string>("data_path"),
  exportData: (stamp: string) => invoke<string>("export_data", { stamp }),
  revealPath: (path: string) => invoke<void>("reveal_path", { path }),

  coachPreview: (profile: Profile, year: number) => invoke<Plan>("coach_preview", { profile, year }),
  coachSave: (profile: Profile, year: number, startDay: string) => invoke<ActivePlan>("coach_save", { profile, year, startDay }),
  coachActive: () => invoke<ActivePlan | null>("coach_active"),
  coachSession: (day: string) => invoke<SessionView | null>("coach_session", { day }),
  coachCheckin: (today: string) => invoke<Checkin | null>("coach_checkin", { today }),
  coachClear: () => invoke<void>("coach_clear"),

  recommendMeals: (day: string, slot: Meal, quick: boolean) => invoke<MealSuggestions>("recommend_meals", { day, slot, quick }),
  recipeFor: (name: string) => invoke<Recipe | null>("recipe_for", { name }),
  logRecipe: (day: string, meal: Meal, recipeId: string, portion: number) => invoke<Entry>("log_recipe", { day, meal, recipeId, portion }),
};

export function totals(entries: Entry[]): Macros {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const e of entries) {
    t.kcal += e.kcal * e.qty;
    t.protein += e.protein * e.qty;
    t.carbs += e.carbs * e.qty;
    t.fat += e.fat * e.qty;
    t.fiber += e.fiber * e.qty;
  }
  return t;
}

export const emptyMetrics = (): DayMetrics => ({
  water_ml: null, steps: null, sleep_h: null, weight_kg: null, body_fat: null, energy: null, note: null,
});
