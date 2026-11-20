import { useEffect, useState } from "react";
import { api, MEAL_LABEL, MEALS, type Diet, type DishKind, type Entry, type Meal, type MealSuggestion } from "../api";
import { useData, useSettings, useStore } from "../store";
import { nextMeal, today } from "../lib/date";
import { fraction, int } from "../lib/units";
import { Segmented } from "./ui";
import { ICheck } from "./icons";

const KIND: Record<DishKind, { label: string; color: string }> = {
  vegan: { label: "Vegan", color: "var(--steps)" },
  vegetarian: { label: "Veg", color: "var(--good)" },
  egg: { label: "Egg", color: "var(--carbs)" },
  fish: { label: "Fish", color: "var(--water)" },
  meat: { label: "Meat", color: "var(--fat)" },
};

const DIETS: { value: Diet; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "pescatarian", label: "Pesc." },
  { value: "eggetarian", label: "Egg" },
  { value: "vegetarian", label: "Veg" },
  { value: "vegan", label: "Vegan" },
];

/**
 * "What should I eat now?" Picks the meal from the clock and what's already
 * logged, then asks the Rust scorer for dishes that fit what's left today.
 */
export function Suggestions({ day, entries, className = "" }: { day: string; entries: Entry[]; className?: string }) {
  const s = useSettings();
  const update = useStore((x) => x.updateSettings);
  const logged = [...new Set(entries.map((e) => e.meal))];
  const auto = day === today() ? nextMeal(logged) : "lunch";
  const [slot, setSlot] = useState<Meal>(auto);
  const [touched, setTouched] = useState(false);
  const [quick, setQuick] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Follow the clock until the user picks a meal themselves.
  useEffect(() => {
    if (!touched) setSlot(auto);
  }, [auto, touched]);

  const data = useData(() => api.recommendMeals(day, slot, quick), [day, slot, quick, s.diet, s.kcal, s.protein]);
  const now = new Date();
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const log = async (x: MealSuggestion) => {
    const e = await api.logRecipe(day, slot, x.id, x.portion);
    setDone((d) => ({ ...d, [x.id]: true }));
    useStore.getState().bump();
    useStore.getState().notify(`Logged ${x.name} to ${MEAL_LABEL[slot]}`, async () => {
      await api.deleteEntry(e.id);
      setDone((d) => ({ ...d, [x.id]: false }));
      useStore.getState().bump();
    });
  };

  const b = data?.budget;
  const openRecipe = (x: MealSuggestion) =>
    useStore.getState().open({
      type: "recipe",
      // Suggestions carry totals for their portion; the sheet wants one portion.
      recipe: { ...x, kcal: x.kcal / x.portion, protein: x.protein / x.portion, carbs: x.carbs / x.portion, fat: x.fat / x.portion, fiber: x.fiber / x.portion },
      portion: x.portion,
      logTo: done[x.id] ? undefined : { day, meal: slot },
    });

  return (
    <section className={`cell !px-7 !pb-7 ${className}`}>
      <header className="flex items-start justify-between gap-6">
        <div>
          <h2 className="label flex items-center gap-2">
            <span className="opacity-60">00</span> What to eat now
            {day === today() && <span className="opacity-60">· {clock}</span>}
          </h2>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="title text-[26px] leading-none">Suggested for {MEAL_LABEL[slot].toLowerCase()}</span>
          </div>
          {b && (
            <p className="mt-2 text-[13px] text-ink2">
              {b.over ? (
                <>You've reached today's calories, so these are the lightest options that still bring protein.</>
              ) : (
                <>
                  Aiming for about <span className="num text-ink">{int(b.kcal)} kcal</span> and <span className="num text-ink">{int(b.protein)} g protein</span>, this
                  meal's share of the <span className="num">{int(b.kcal_left)}</span> kcal and <span className="num">{int(b.protein_left)}</span> g you have left.
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <Segmented
            value={slot}
            onChange={(v) => (setSlot(v), setTouched(true))}
            options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
          />
          <div className="flex items-center gap-5">
            <Segmented value={s.diet} onChange={(v) => void update({ diet: v })} options={DIETS} />
            <button
              onClick={() => setQuick(!quick)}
              className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em]"
              style={{ color: quick ? "var(--ink)" : "var(--ink-3)" }}
              title="Only dishes ready in 10 minutes or less"
            >
              <span className="h-2 w-2 rounded-full" style={{ boxShadow: "inset 0 0 0 1px var(--ink-3)", background: quick ? "var(--accent)" : "transparent" }} />
              ≤10 min
            </button>
          </div>
        </div>
      </header>

      {data && data.suggestions.length === 0 && <p className="mt-8 text-[13px] text-ink3">Nothing fits those filters. Try turning off ≤10 min or widening the diet.</p>}

      <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-[12px]" style={{ background: "var(--line)" }}>
        {data?.suggestions.map((x, i) => (
          <article key={x.id} className="anim-fade flex flex-col p-5" style={{ background: "var(--surface-solid)", animationDelay: `${i * 30}ms` }}>
            <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-[0.06em] text-ink3">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND[x.kind].color }} />
              {KIND[x.kind].label}
              <span>·</span>
              {x.minutes ? `${x.minutes} min` : "No cooking"}
              {i === 0 && <span className="ml-auto" style={{ color: "var(--accent)" }}>Best fit</span>}
            </div>
            <button className="title mt-2.5 text-left text-[17px] leading-snug underline-offset-4 hover:underline" onClick={() => openRecipe(x)}>
              {x.name}
            </button>
            <p className="mt-1 text-[12px] text-ink3">
              {x.portion !== 1 && <span className="num text-ink2">{fraction(x.portion)} × </span>}
              {x.serving}
            </p>

            <div className="mt-4 flex items-end justify-between gap-3">
              <span className="num flex items-baseline gap-1">
                <span className="display text-[30px] leading-none">{int(x.kcal)}</span>
                <span className="mono text-[10.5px] text-ink3">KCAL</span>
              </span>
              <span className="mono num flex gap-2.5 pb-0.5 text-[11px]">
                <span style={{ color: "var(--protein)" }}>P {int(x.protein)}</span>
                <span style={{ color: "var(--carbs)" }}>C {int(x.carbs)}</span>
                <span style={{ color: "var(--fat)" }}>F {int(x.fat)}</span>
              </span>
            </div>
            {b && !b.over && (
              <div className="mt-2.5 h-[2px] w-full" style={{ background: "var(--line)" }}>
                <div className="bar-grow h-full" style={{ width: `${Math.min(1, x.kcal / Math.max(1, b.kcal)) * 100}%`, background: x.kcal > b.kcal * 1.1 ? "var(--warn)" : "var(--ink)" }} />
              </div>
            )}

            <p className="mt-4 line-clamp-2 text-[12px] leading-relaxed text-ink2">{x.ingredients.filter((g) => g.qty).map((g) => g.item.split(",")[0]).join(" · ")}</p>
            <ul className="mt-3 flex-1 space-y-1">
              {x.reasons.slice(0, 2).map((r) => (
                <li key={r} className="flex gap-2 text-[11.5px] leading-snug text-ink3">
                  <span style={{ color: r.startsWith("You had") ? "var(--warn)" : "var(--accent)" }}>—</span>
                  {r}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center gap-1.5">
              {done[x.id] ? (
                <span className="flex h-[30px] items-center gap-1.5 text-[12.5px] text-ink2">
                  <ICheck size={13} style={{ color: "var(--good)" }} /> Logged to {MEAL_LABEL[slot].toLowerCase()}
                </span>
              ) : (
                <button className="btn btn-outline" onClick={() => void log(x)}>
                  Log to {MEAL_LABEL[slot].toLowerCase()}
                </button>
              )}
              <button className="btn" onClick={() => openRecipe(x)}>
                Recipe →
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 text-[11.5px] text-ink3">
        Picked by fit to your remaining calories and protein, protein density for your goal, fibre and variety. Dishes you've had in the last three days drop down the list. Values are
        typical home-cooked amounts.
      </p>
    </section>
  );
}
