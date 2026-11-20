import { useEffect, useMemo, useRef, useState } from "react";
import { api, MEAL_LABEL, MEALS, type Food, type Meal } from "../api";
import { useData, useStore } from "../store";
import { addDays, relativeDay } from "../lib/date";
import { dec, int } from "../lib/units";
import { Field, NumberField, Segmented, Sheet } from "../components/ui";
import { ICheck, ICopy, ISearch, IStar } from "../components/icons";

type Added = { id: number; name: string; kcal: number };

export function FoodSheet({ meal: initialMeal, day }: { meal: Meal; day: string }) {
  const { close, bump, notify } = useStore.getState();
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [mode, setMode] = useState<"search" | "custom">("search");
  const [added, setAdded] = useState<Added[]>([]);

  const onAdded = (a: Added) => {
    setAdded((xs) => [...xs, a]);
    bump();
  };

  return (
    <Sheet
      title={
        <span className="flex items-center gap-3">
          Log food
          <span className="text-[12px] font-normal text-ink3">{relativeDay(day)}</span>
        </span>
      }
      onClose={close}
      width={620}
      footer={
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-[12px] text-ink2">
            {added.length > 0 ? (
              <>
                <ICheck size={13} className="shrink-0 text-good" />
                <span className="truncate">
                  {added.length} added · <span className="num">{int(added.reduce((s, a) => s + a.kcal, 0))} kcal</span>
                </span>
              </>
            ) : (
              <span className="text-ink3">
                <span className="kbd">↑↓</span> choose <span className="kbd ml-2">↵</span> pick <span className="kbd ml-2">⌘↵</span> add & close
              </span>
            )}
          </div>
          <button className="btn btn-primary" onClick={close}>
            Done
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))} />
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "search", label: "Library" },
            { value: "custom", label: "Quick add" },
          ]}
        />
      </div>
      {mode === "search" ? (
        <SearchPane day={day} meal={meal} onAdded={onAdded} onCustom={() => setMode("custom")} />
      ) : (
        <CustomPane
          day={day}
          meal={meal}
          onAdded={(a) => {
            onAdded(a);
            notify(`Added ${a.name} to ${MEAL_LABEL[meal]}`);
            setMode("search");
          }}
        />
      )}
    </Sheet>
  );
}

function SearchPane({ day, meal, onAdded, onCustom }: { day: string; meal: Meal; onAdded: (a: Added) => void; onCustom: () => void }) {
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [picked, setPicked] = useState<Food | null>(null);
  const [qty, setQty] = useState<number | null>(1);
  const [favs, setFavs] = useState<Record<number, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const foods = useData(() => api.searchFoods(query, 60), [query]) ?? [];
  const yesterday = useData(() => api.getDay(addDays(day, -1)), [day]);
  const yMeal = yesterday?.entries.filter((e) => e.meal === meal) ?? [];

  useEffect(() => { setSel(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const add = async (food: Food, q: number, closeAfter: boolean) => {
    const e = await api.addEntry({
      day,
      meal,
      food_id: food.id,
      name: food.name,
      serving: food.serving,
      qty: q,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      save_food: false,
    });
    onAdded({ id: e.id, name: food.name, kcal: food.kcal * q });
    setPicked(null);
    setQty(1);
    setQuery("");
    if (closeAfter) useStore.getState().close();
    else inputRef.current?.focus();
  };

  const copyYesterday = async () => {
    const n = await api.copyMeal(addDays(day, -1), day, meal);
    onAdded({ id: -Date.now(), name: `${n} from yesterday`, kcal: yMeal.reduce((s, e) => s + e.kcal * e.qty, 0) });
    useStore.getState().notify(`Copied ${n} item${n === 1 ? "" : "s"} from yesterday's ${MEAL_LABEL[meal].toLowerCase()}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (picked) return;
    if (e.key === "ArrowDown") e.preventDefault(), setSel((i) => Math.min(i + 1, foods.length - 1));
    if (e.key === "ArrowUp") e.preventDefault(), setSel((i) => Math.max(i - 1, 0));
    if (e.key === "Enter" && foods[sel]) {
      e.preventDefault();
      if (e.metaKey) void add(foods[sel], 1, true);
      else setPicked(foods[sel]);
    }
  };

  if (picked) {
    const q = qty ?? 0;
    return (
      <div className="anim-rise px-5 pb-6 pt-5">
        <button className="text-[12px] text-ink3 hover:text-ink" onClick={() => setPicked(null)}>
          ← Back to search
        </button>
        <h3 className="display mt-3 text-[22px] font-semibold">{picked.name}</h3>
        <p className="text-[12px] text-ink3">Per {picked.serving}</p>
        <div className="mt-5 grid grid-cols-[180px_1fr] items-end gap-6">
          <Field label="Servings">
            <NumberField
              size="lg"
              value={qty}
              onChange={setQty}
              step={0.25}
              dp={2}
              autoFocus
              onEnter={() => q > 0 && void add(picked, q, false)}
            />
          </Field>
          <div className="grid grid-cols-4 gap-3 pb-1">
            <MacroStat label="Calories" value={int(picked.kcal * q)} unit="kcal" />
            <MacroStat label="Protein" value={dec(picked.protein * q)} unit="g" color="var(--protein)" />
            <MacroStat label="Carbs" value={dec(picked.carbs * q)} unit="g" color="var(--carbs)" />
            <MacroStat label="Fat" value={dec(picked.fat * q)} unit="g" color="var(--fat)" />
          </div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {[0.5, 1, 1.5, 2, 3].map((v) => (
            <button key={v} className={`btn btn-sm ${qty === v ? "btn-outline" : ""}`} onClick={() => setQty(v)}>
              {v}×
            </button>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <button className="btn btn-accent" disabled={!q} onClick={() => void add(picked, q, false)}>
            Add to {MEAL_LABEL[meal]} <span className="kbd !bg-white/20 !text-white !shadow-none">↵</span>
          </button>
          <button className="btn" disabled={!q} onClick={() => void add(picked, q, true)}>
            Add & close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <div className="mx-5 mt-4 flex h-10 items-center gap-2 rounded-[10px] bg-surface px-3" style={{ boxShadow: "inset 0 0 0 1px var(--line-2)" }}>
        <ISearch size={15} className="text-ink3" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search your foods…"
          className="input-bare text-[14px]"
        />
      </div>
      {!query && yMeal.length > 0 && (
        <button className="row-hover mx-3 mt-2 flex w-[calc(100%-24px)] items-center gap-3 rounded-lg px-2 py-2 text-left" onClick={() => void copyYesterday()}>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sunk text-ink2">
            <ICopy size={14} />
          </span>
          <span className="flex-1">
            <span className="block text-[13px] font-medium">Same as yesterday's {MEAL_LABEL[meal].toLowerCase()}</span>
            <span className="block truncate text-[12px] text-ink3">{yMeal.map((e) => e.name).join(", ")}</span>
          </span>
          <span className="num text-[12px] text-ink2">{int(yMeal.reduce((s, e) => s + e.kcal * e.qty, 0))} kcal</span>
        </button>
      )}
      <div className="eyebrow mx-5 mb-1 mt-4">{query ? "Results" : "Favourites & recent"}</div>
      <div ref={listRef} className="px-3">
        {foods.map((f, i) => {
          const fav = favs[f.id] ?? f.favorite;
          return (
            <div
              key={f.id}
              data-i={i}
              onMouseMove={() => setSel(i)}
              onClick={() => setPicked(f)}
              className="group flex items-center gap-3 rounded-lg px-2 py-2"
              style={{ background: sel === i ? "var(--sunk)" : undefined }}
            >
              <button
                className="shrink-0 text-ink3 hover:text-warn"
                style={{ color: fav ? "var(--carbs)" : undefined, opacity: fav || sel === i ? 1 : 0.35 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  const v = await api.toggleFavorite(f.id);
                  setFavs((m) => ({ ...m, [f.id]: v }));
                }}
                aria-label="Favourite"
              >
                <IStar size={14} filled={fav} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{f.name}</div>
                <div className="num truncate text-[11px] text-ink3">
                  {f.serving} · <span style={{ color: "var(--protein)" }}>P {dec(f.protein)}</span> · <span style={{ color: "var(--carbs)" }}>C {dec(f.carbs)}</span> ·{" "}
                  <span style={{ color: "var(--fat)" }}>F {dec(f.fat)}</span>
                </div>
              </div>
              <span className="num text-[13px] font-medium">{int(f.kcal)}</span>
              <span className="w-7 text-[11px] text-ink3">kcal</span>
              <button
                className="btn btn-sm btn-outline opacity-0 group-hover:opacity-100"
                style={{ opacity: sel === i ? 1 : undefined }}
                onClick={(e) => (e.stopPropagation(), void add(f, 1, false))}
              >
                + 1
              </button>
            </div>
          );
        })}
        {foods.length === 0 && (
          <div className="px-2 py-8 text-center">
            <p className="text-[13px] text-ink2">Nothing called “{query}” yet.</p>
            <button className="btn btn-outline mt-3" onClick={onCustom}>
              Create it with Quick add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroStat({ label, value, unit, color }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-ink3">
        {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </div>
      <div className="num mt-0.5 text-[17px] font-semibold">
        {value}
        <span className="ml-0.5 text-[11px] font-normal text-ink3">{unit}</span>
      </div>
    </div>
  );
}

function CustomPane({ day, meal, onAdded }: { day: string; meal: Meal; onAdded: (a: Added) => void }) {
  const [name, setName] = useState("");
  const [serving, setServing] = useState("1 serving");
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [fiber, setFiber] = useState<number | null>(null);
  const [save, setSave] = useState(true);

  const fromMacros = useMemo(() => (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9, [protein, carbs, fat]);
  const cal = kcal ?? (fromMacros || null);
  const valid = name.trim() && cal != null;

  const submit = async () => {
    if (!valid) return;
    const e = await api.addEntry({
      day,
      meal,
      food_id: null,
      name: name.trim(),
      serving: serving.trim() || "1 serving",
      qty: 1,
      kcal: cal ?? 0,
      protein: protein ?? 0,
      carbs: carbs ?? 0,
      fat: fat ?? 0,
      fiber: fiber ?? 0,
      save_food: save,
    });
    onAdded({ id: e.id, name: e.name, kcal: e.kcal });
  };

  return (
    <form
      className="anim-rise px-5 pb-6 pt-5"
      onSubmit={(e) => (e.preventDefault(), void submit())}
      onKeyDown={(e) => e.key === "Enter" && e.metaKey && void submit()}
    >
      <div className="grid grid-cols-[1fr_180px] gap-3">
        <Field label="Name">
          <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Overnight oats" />
        </Field>
        <Field label="Serving">
          <input className="input" value={serving} onChange={(e) => setServing(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-3">
        <Field label="Calories" hint={kcal == null && fromMacros > 0 ? `${int(fromMacros)} from macros` : undefined}>
          <NumberField value={kcal} onChange={setKcal} stepper={false} suffix="kcal" placeholder={fromMacros ? String(Math.round(fromMacros)) : "0"} />
        </Field>
        <Field label={<Dot color="var(--protein)">Protein</Dot>}>
          <NumberField value={protein} onChange={setProtein} stepper={false} suffix="g" dp={1} placeholder="0" />
        </Field>
        <Field label={<Dot color="var(--carbs)">Carbs</Dot>}>
          <NumberField value={carbs} onChange={setCarbs} stepper={false} suffix="g" dp={1} placeholder="0" />
        </Field>
        <Field label={<Dot color="var(--fat)">Fat</Dot>}>
          <NumberField value={fat} onChange={setFat} stepper={false} suffix="g" dp={1} placeholder="0" />
        </Field>
        <Field label="Fibre">
          <NumberField value={fiber} onChange={setFiber} stepper={false} suffix="g" dp={1} placeholder="0" />
        </Field>
      </div>
      <label className="mt-5 flex items-center gap-2 text-[13px] text-ink2">
        <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="accent-[var(--accent)]" />
        Save to my library for next time
      </label>
      <div className="mt-6">
        <button type="submit" className="btn btn-accent" disabled={!valid}>
          Add to {MEAL_LABEL[meal]}
        </button>
      </div>
    </form>
  );
}

export function Dot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}
