import { useState } from "react";
import { api, MEAL_LABEL, type Meal, type Recipe } from "../api";
import { useStore } from "../store";
import { amount, fraction, int } from "../lib/units";
import { Sheet } from "../components/ui";
import { ICheck } from "../components/icons";

const KIND_LABEL = { vegan: "Vegan", vegetarian: "Vegetarian", egg: "Egg", fish: "Fish", meat: "Meat" } as const;

/**
 * A recipe to cook from: ingredients scaled to the portion, a method you can
 * tick through, and (when opened from a suggestion) a button to log it.
 */
export function RecipeSheet({ recipe, portion: initial, logTo }: { recipe: Recipe; portion: number; logTo?: { day: string; meal: Meal } }) {
  const { close, bump, notify } = useStore.getState();
  const [portion, setPortion] = useState(initial);
  const [have, setHave] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [logged, setLogged] = useState(false);

  const m = (v: number) => v * portion;
  const step = (d: number) => setPortion((p) => Math.min(4, Math.max(0.5, Math.round((p + d) * 4) / 4)));

  const log = async () => {
    if (!logTo) return;
    const e = await api.logRecipe(logTo.day, logTo.meal, recipe.id, portion);
    setLogged(true);
    bump();
    notify(`Logged ${recipe.name} to ${MEAL_LABEL[logTo.meal]}`, async () => {
      await api.deleteEntry(e.id);
      setLogged(false);
      useStore.getState().bump();
    });
  };

  const stepsDone = Object.values(done).filter(Boolean).length;

  return (
    <Sheet
      title={<span>{recipe.name}</span>}
      onClose={close}
      width={760}
      footer={
        <>
          <span className="mono flex-1 text-[10.5px] uppercase text-ink3">
            {stepsDone ? `${stepsDone} of ${recipe.steps.length} steps done` : "Tap ingredients and steps to tick them off"}
          </span>
          <button className="btn" onClick={close}>
            Close
          </button>
          {logTo &&
            (logged ? (
              <span className="flex h-[30px] items-center gap-1.5 px-2 text-[12.5px] text-ink2">
                <ICheck size={13} style={{ color: "var(--good)" }} /> Logged
              </span>
            ) : (
              <button className="btn btn-primary" onClick={() => void log()}>
                Log {fraction(portion)} × to {MEAL_LABEL[logTo.meal].toLowerCase()}
              </button>
            ))}
        </>
      }
    >
      {/* Summary strip */}
      <div className="grid grid-cols-[1fr_auto] items-end gap-6 px-7 pb-6 pt-6" style={{ boxShadow: "0 1px 0 var(--line)" }}>
        <div>
          <div className="mono text-[10.5px] uppercase tracking-[0.06em] text-ink3">
            {KIND_LABEL[recipe.kind]} · {recipe.minutes ? `${recipe.minutes} min` : "No cooking"} · one portion is {recipe.serving}
          </div>
          <div className="mt-4 flex items-end gap-8">
            <span className="num flex items-baseline gap-1.5">
              <span className="display text-[44px] leading-none">{int(m(recipe.kcal))}</span>
              <span className="mono text-[11px] text-ink3">KCAL</span>
            </span>
            <dl className="mono num grid grid-cols-4 gap-5 pb-1 text-[11px]">
              {(
                [
                  ["Protein", recipe.protein, "var(--protein)"],
                  ["Carbs", recipe.carbs, "var(--carbs)"],
                  ["Fat", recipe.fat, "var(--fat)"],
                  ["Fibre", recipe.fiber, "var(--steps)"],
                ] as const
              ).map(([l, v, c]) => (
                <div key={l}>
                  <dt className="flex items-center gap-1.5 uppercase text-ink3">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                    {l}
                  </dt>
                  <dd className="mt-1 text-[15px] text-ink">{int(m(v))} g</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="text-right">
          <div className="label mb-1.5">Portions</div>
          <div className="flex items-center gap-1">
            <button className="btn btn-sm btn-icon btn-outline" onClick={() => step(-0.25)} disabled={portion <= 0.5} aria-label="Fewer">
              −
            </button>
            <span className="num display w-14 text-center text-[26px] leading-none">{fraction(portion)}</span>
            <button className="btn btn-sm btn-icon btn-outline" onClick={() => step(0.25)} disabled={portion >= 4} aria-label="More">
              +
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Ingredients */}
        <section className="px-7 py-6" style={{ boxShadow: "1px 0 0 var(--line)" }}>
          <h3 className="label mb-3">Ingredients</h3>
          <ul className="space-y-0.5">
            {recipe.ingredients.map((g, i) => {
              const on = have[i];
              return (
                <li key={i}>
                  <button
                    onClick={() => setHave((h) => ({ ...h, [i]: !h[i] }))}
                    className="row-hover -mx-2 grid w-[calc(100%+16px)] grid-cols-[16px_76px_1fr] items-baseline gap-2.5 rounded-md px-2 py-1.5 text-left"
                  >
                    <span
                      className="flex h-3.5 w-3.5 translate-y-[2px] items-center justify-center rounded-[4px] transition-colors"
                      style={{ boxShadow: on ? "none" : "inset 0 0 0 1.25px var(--ink-3)", background: on ? "var(--accent)" : "transparent", color: "var(--on-accent)" }}
                    >
                      {on && <ICheck size={10} />}
                    </span>
                    <span className="num mono text-[12px]" style={{ color: on ? "var(--ink-3)" : "var(--ink)" }}>
                      {amount(g.qty, g.unit, portion) || "—"}
                    </span>
                    <span className="text-[13px] leading-snug" style={{ color: on ? "var(--ink-3)" : "var(--ink-2)", textDecoration: on ? "line-through" : undefined }}>
                      {g.item}
                      {!g.qty && <span className="text-ink3">, to taste</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Method */}
        <section className="px-7 py-6">
          <h3 className="label mb-3">Method</h3>
          <ol className="space-y-1">
            {recipe.steps.map((t, i) => {
              const on = done[i];
              return (
                <li key={i}>
                  <button
                    onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                    className="row-hover -mx-2 grid w-[calc(100%+16px)] grid-cols-[28px_1fr] gap-2 rounded-md px-2 py-2 text-left"
                  >
                    <span className="mono pt-[2px] text-[11px]" style={{ color: on ? "var(--good)" : "var(--accent)" }}>
                      {on ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13.5px] leading-relaxed" style={{ color: on ? "var(--ink-3)" : "var(--ink)" }}>
                      {t}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {portion !== 1 && (
            <p className="mt-4 text-[11.5px] leading-relaxed text-ink3">
              Quantities are scaled to {fraction(portion)} portions. Cooking times stay about the same; give larger pans a minute or two longer.
            </p>
          )}
        </section>
      </div>
    </Sheet>
  );
}
