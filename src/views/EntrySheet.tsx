import { useEffect, useState } from "react";
import { api, MEAL_LABEL, MEALS, type Entry, type Meal } from "../api";
import { useData, useStore } from "../store";
import { relativeDay } from "../lib/date";
import { dec, int } from "../lib/units";
import { NumberField, Segmented, Sheet } from "../components/ui";
import { ITrash } from "../components/icons";

type Key = "kcal" | "protein" | "carbs" | "fat" | "fiber";
const FIELDS: { key: Key; label: string; unit: string; color?: string; kcalPerG?: number }[] = [
  { key: "kcal", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g", color: "var(--protein)", kcalPerG: 4 },
  { key: "carbs", label: "Carbs", unit: "g", color: "var(--carbs)", kcalPerG: 4 },
  { key: "fat", label: "Fat", unit: "g", color: "var(--fat)", kcalPerG: 9 },
  { key: "fiber", label: "Fibre", unit: "g", color: "var(--steps)" },
];

/** Edit everything about a logged entry: what it was, how much, and its macros. */
export function EntrySheet({ entry }: { entry: Entry }) {
  const { close, bump, notify } = useStore.getState();
  const [name, setName] = useState(entry.name);
  const [serving, setServing] = useState(entry.serving);
  const [meal, setMeal] = useState<Meal>(entry.meal);
  const [qty, setQty] = useState<number | null>(entry.qty);
  // Values are kept per serving; "This entry" mode shows and edits them × amount.
  const [per, setPer] = useState<Record<Key, number>>({ kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat, fiber: entry.fiber });
  const [mode, setMode] = useState<"total" | "per">("total");
  const [kcalTouched, setKcalTouched] = useState(false);
  const [updateFood, setUpdateFood] = useState(false);
  const recipe = useData(() => api.recipeFor(entry.name), [entry.name]);

  const q = qty && qty > 0 ? qty : 1;
  const mult = mode === "total" ? q : 1;
  const shown = (k: Key) => Math.round(per[k] * mult * 10) / 10;

  const setField = (k: Key, v: number | null) => {
    const next = (v ?? 0) / mult;
    setPer((p) => {
      const out = { ...p, [k]: next };
      // Calories follow macro edits (4/4/9 kcal per g) until edited directly.
      const f = FIELDS.find((x) => x.key === k)!;
      if (f.kcalPerG && !kcalTouched) out.kcal = Math.max(0, p.kcal + (next - p[k]) * f.kcalPerG);
      return out;
    });
    if (k === "kcal") setKcalTouched(true);
  };

  const before = { kcal: entry.kcal * entry.qty, protein: entry.protein * entry.qty, carbs: entry.carbs * entry.qty, fat: entry.fat * entry.qty };
  const after = { kcal: per.kcal * q, protein: per.protein * q, carbs: per.carbs * q, fat: per.fat * q };
  const fromMacros = per.protein * 4 + per.carbs * 4 + per.fat * 9;
  const mismatch = Math.abs(fromMacros - per.kcal) > Math.max(25, per.kcal * 0.12);
  const changed =
    name.trim() !== entry.name || serving.trim() !== entry.serving || meal !== entry.meal || q !== entry.qty || FIELDS.some((f) => Math.abs(per[f.key] - entry[f.key]) > 1e-6);
  const valid = name.trim().length > 0 && qty != null && qty > 0;

  const save = async () => {
    if (!valid) return;
    await api.editEntry(entry.id, { name: name.trim(), serving: serving.trim() || "1 serving", meal, qty: q, ...per }, updateFood && entry.food_id != null);
    bump();
    close();
    notify(`Updated ${name.trim()}`, async () => {
      await api.editEntry(entry.id, { name: entry.name, serving: entry.serving, meal: entry.meal, qty: entry.qty, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat, fiber: entry.fiber }, false);
      useStore.getState().bump();
    });
  };

  const remove = async () => {
    await api.deleteEntry(entry.id);
    bump();
    close();
    notify(`Removed ${entry.name}`, async () => {
      await api.addEntry({ ...entry, save_food: false });
      useStore.getState().bump();
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Enter" && e.metaKey && (e.preventDefault(), void save());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const diff = after.kcal - before.kcal;

  return (
    <Sheet
      title={
        <span className="flex items-baseline gap-3">
          Edit entry
          <span className="mono text-[10.5px] font-normal uppercase tracking-[0.06em] text-ink3">
            {MEAL_LABEL[entry.meal]} · {relativeDay(entry.day)}
          </span>
        </span>
      }
      onClose={close}
      width={640}
      footer={
        <>
          <button className="btn -ml-3 text-danger hover:!text-danger" onClick={() => void remove()}>
            <ITrash size={13} /> Delete
          </button>
          <span className="flex-1" />
          <span className="mono mr-2 text-[10px] text-ink3">⌘↵ SAVE</span>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!valid || !changed} onClick={() => void save()}>
            Save changes
          </button>
        </>
      }
    >
      <div className="px-6 pb-7 pt-6">
        {recipe && (
          <button
            className="row-hover -mx-2 -mt-2 mb-5 flex w-[calc(100%+16px)] items-center justify-between rounded-lg px-2 py-2 text-left"
            onClick={() => useStore.getState().open({ type: "recipe", recipe, portion: entry.qty })}
          >
            <span className="text-[12.5px] text-ink2">This is one of Tally's recipes: ingredients and method for {entry.qty === 1 ? "one portion" : `${dec(entry.qty)} portions`}.</span>
            <span className="text-[12.5px] text-ink">View recipe →</span>
          </button>
        )}
        {/* What it is */}
        <div className="grid grid-cols-[1fr_200px] gap-6">
          <label className="block">
            <span className="label mb-1 block">Name</span>
            <input autoFocus className="input !h-10 !text-[17px] font-medium" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="label mb-1 block">One serving is</span>
            <input className="input !h-10" value={serving} onChange={(e) => setServing(e.target.value)} />
          </label>
        </div>

        {/* How much, which meal */}
        <div className="mt-7 grid grid-cols-[200px_1fr] gap-6">
          <div>
            <span className="label mb-1 block">Servings</span>
            <NumberField value={qty} onChange={setQty} step={0.25} dp={2} min={0} size="lg" />
            <div className="mt-2 flex gap-1">
              {[0.5, 1, 1.5, 2].map((v) => (
                <button key={v} className="btn btn-sm" style={q === v ? { boxShadow: "inset 0 0 0 1px var(--ink-3)", color: "var(--ink)" } : undefined} onClick={() => setQty(v)}>
                  {v === 0.5 ? "½" : v === 1.5 ? "1½" : v}×
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label mb-1 block">Meal</span>
            <Segmented className="h-11 items-center" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} />
          </div>
        </div>

        {/* Nutrition */}
        <div className="mt-8 pt-6" style={{ boxShadow: "0 -1px 0 var(--line)" }}>
          <div className="flex items-center justify-between">
            <span className="label">Nutrition</span>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "total", label: q === 1 ? "This entry" : `This entry (${dec(q)}×)` },
                { value: "per", label: "Per serving" },
              ]}
            />
          </div>
          <div className="mt-4 grid grid-cols-5 gap-4">
            {FIELDS.map((f) => {
              const was = Math.round(entry[f.key] * (mode === "total" ? entry.qty : 1) * 10) / 10;
              const now = shown(f.key);
              const moved = Math.abs(now - was) >= 0.1;
              return (
                <label key={f.key} className="block">
                  <span className="label mb-1 flex items-center gap-1.5">
                    {f.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: f.color }} />}
                    {f.label}
                  </span>
                  <NumberField value={now} onChange={(v) => setField(f.key, v)} step={f.key === "kcal" ? 10 : 1} dp={f.key === "kcal" ? 0 : 1} suffix={f.unit} stepper={false} size="lg" />
                  <span className="mono mt-1.5 block h-3 text-[10px] text-ink3">{moved ? `WAS ${f.key === "kcal" ? int(was) : dec(was)}` : ""}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed" style={{ color: mismatch ? "var(--warn)" : "var(--ink-3)" }}>
            {kcalTouched
              ? mismatch
                ? `These macros add up to about ${int(fromMacros * mult)} kcal, not ${int(per.kcal * mult)}. Check the label.`
                : "Calories set by hand."
              : "Calories follow your macro edits: 4 kcal per gram of protein or carbs, 9 per gram of fat."}
            {kcalTouched && (
              <button className="ml-2 underline underline-offset-2" onClick={() => (setKcalTouched(false), setPer((p) => ({ ...p, kcal: fromMacros })))}>
                Recalculate from macros
              </button>
            )}
          </p>
        </div>

        {/* Before → after */}
        <div className="mt-6 grid grid-cols-[1fr_auto] items-center gap-6 rounded-[12px] px-5 py-4" style={{ background: "var(--sunk)" }}>
          <div className="space-y-2">
            <MacroBar label="Before" v={before} />
            <MacroBar label="After" v={after} />
          </div>
          <div className="text-right">
            <div className="num display text-[30px] leading-none">{int(after.kcal)}</div>
            <div className="mono mt-1 text-[10.5px]" style={{ color: Math.abs(diff) < 1 ? "var(--ink-3)" : diff < 0 ? "var(--good)" : "var(--ink-2)" }}>
              {Math.abs(diff) < 1 ? "NO CHANGE" : `${diff > 0 ? "+" : "−"}${int(Math.abs(diff))} KCAL`}
            </div>
          </div>
        </div>

        {entry.food_id != null && (
          <label className="mt-5 flex items-start gap-2.5 text-[12.5px] text-ink2">
            <input type="checkbox" className="mt-[3px] accent-[var(--accent)]" checked={updateFood} onChange={(e) => setUpdateFood(e.target.checked)} />
            <span>
              Also update <span className="text-ink">“{entry.name}”</span> in my food library, so next time it's logged with these per-serving values. Past days keep theirs.
            </span>
          </label>
        )}
      </div>
    </Sheet>
  );
}

function MacroBar({ label, v }: { label: string; v: { kcal: number; protein: number; carbs: number; fat: number } }) {
  const p = v.protein * 4;
  const c = v.carbs * 4;
  const f = v.fat * 9;
  const t = p + c + f || 1;
  return (
    <div className="grid grid-cols-[52px_1fr_150px] items-center gap-3">
      <span className="mono text-[10px] uppercase text-ink3">{label}</span>
      <div className="flex h-[6px] gap-[2px] overflow-hidden rounded-full">
        <div className="bar-grow" style={{ width: `${(p / t) * 100}%`, background: "var(--protein)" }} />
        <div className="bar-grow" style={{ width: `${(c / t) * 100}%`, background: "var(--carbs)" }} />
        <div className="bar-grow" style={{ width: `${(f / t) * 100}%`, background: "var(--fat)" }} />
      </div>
      <span className="mono num text-right text-[10.5px] text-ink2">
        P {dec(v.protein)} · C {dec(v.carbs)} · F {dec(v.fat)}
      </span>
    </div>
  );
}
