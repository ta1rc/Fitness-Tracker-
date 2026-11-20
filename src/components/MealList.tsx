import { MEAL_LABEL, MEALS, totals, type Entry } from "../api";
import { useStore } from "../store";
import { fraction, int } from "../lib/units";
import { IEdit, IPlus } from "./icons";

/** The day's diary: one block per meal, rows editable in place. */
export function MealList({ day, entries, compact = false }: { day: string; entries: Entry[]; compact?: boolean }) {
  const { open: openSheet } = useStore.getState();

  return (
    <div className="divide-y divide-[var(--line)]">
      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal);
        const t = totals(items);
        return (
          <div key={meal} className="py-3 first:pt-0 last:pb-0">
            <div className="group flex items-center gap-3">
              <h3 className="title text-[15px]">{MEAL_LABEL[meal]}</h3>
              {items.length > 0 && (
                <span className="mono num text-[10.5px] text-ink3">
                  {int(t.kcal)} KCAL{!compact && <> · P {int(t.protein)} · C {int(t.carbs)} · F {int(t.fat)}</>}
                </span>
              )}
              <button className="btn btn-sm ml-auto text-ink3" onClick={() => openSheet({ type: "food", meal, day })}>
                <IPlus size={12} /> Add
              </button>
            </div>
            {items.length === 0 ? (
              <button className="mt-1 w-full py-1.5 text-left text-[12.5px] text-ink3 transition-colors hover:text-ink2" onClick={() => openSheet({ type: "food", meal, day })}>
                Nothing yet. Add {MEAL_LABEL[meal].toLowerCase()} →
              </button>
            ) : (
              <ul className="-mx-2 mt-1">
                {items.map((e) => (
                  <EntryRow key={e.id} e={e} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EntryRow({ e }: { e: Entry }) {
  const open = useStore((x) => x.open);
  const q = e.qty;
  return (
    <li>
      <button
        className="row-hover group grid w-full grid-cols-[minmax(0,1fr)_auto_52px_16px] items-center gap-4 rounded-lg px-2 py-2 text-left"
        onClick={() => open({ type: "entry", entry: e })}
        title="Edit"
      >
        <span className="min-w-0">
          <span className="block truncate text-[13.5px]">{e.name}</span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink3">
            {q !== 1 && <span className="num text-ink2">{fraction(q)} × </span>}
            {e.serving}
          </span>
        </span>
        <span className="mono num grid grid-cols-[repeat(3,40px)] text-[10.5px]">
          {(
            [
              ["P", e.protein, "var(--protein)"],
              ["C", e.carbs, "var(--carbs)"],
              ["F", e.fat, "var(--fat)"],
            ] as const
          ).map(([k, v, c]) => (
            <span key={k} className="flex justify-between pr-2">
              <span style={{ color: c }}>{k}</span>
              <span className="text-ink2">{int(v * q)}</span>
            </span>
          ))}
        </span>
        <span className="num text-right text-[14px]">{int(e.kcal * q)}</span>
        <IEdit size={12} className="text-ink3 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </li>
  );
}
