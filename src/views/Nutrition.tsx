import { useState } from "react";
import { api, totals, type DayStat, type Food } from "../api";
import { useData, useSettings, useStore } from "../store";
import { addDays, daysBetween, relativeDay, weekdayNarrow } from "../lib/date";
import { dec, int } from "../lib/units";
import { Bars } from "../components/charts";
import { MealList } from "../components/MealList";
import { Card, CardHead, Field, Meter, NumberField, Segmented, Sheet } from "../components/ui";
import { IEdit, IPlus, ISearch, IStar, ITrash } from "../components/icons";
import { Dot } from "./FoodSheet";
import { Suggestions } from "../components/Suggestions";

export function Nutrition() {
  const day = useStore((s) => s.day);
  const s = useSettings();
  const data = useData(() => api.getDay(day), [day]);
  const [span, setSpan] = useState<14 | 30>(14);
  const from = addDays(day, -(span - 1));
  const stats = useData(() => api.rangeStats(from, day), [from, day]) ?? [];
  const byDay = new Map(stats.map((x) => [x.day, x]));
  const days = daysBetween(from, day);
  const eaten = stats.filter((x) => x.kcal > 0);
  const last7 = eaten.filter((x) => x.day > addDays(day, -7));
  const avg = (k: keyof DayStat, xs: DayStat[]) => (xs.length ? xs.reduce((a, x) => a + (x[k] as number), 0) / xs.length : 0);
  const onTarget = eaten.filter((x) => Math.abs(x.kcal - s.kcal) <= s.kcal * 0.1).length;

  if (!data) return null;
  const t = totals(data.entries);

  return (
    <div className="stagger sheet grid grid-cols-12">
      <Suggestions className="col-span-12" day={day} entries={data.entries} />
      <Card className="col-span-7 row-span-2">
        <CardHead
          title={`Diary · ${relativeDay(day)}`}
          sub={
            <span className="num">
              {int(t.kcal)} kcal · <span style={{ color: "var(--protein)" }}>P {int(t.protein)}</span> · <span style={{ color: "var(--carbs)" }}>C {int(t.carbs)}</span> ·{" "}
              <span style={{ color: "var(--fat)" }}>F {int(t.fat)}</span> · fibre {int(t.fiber)} g
            </span>
          }
        />
        <MealList day={day} entries={data.entries} />
      </Card>

      <Card className="col-span-5">
        <CardHead title="Last 7 days, on average" sub={`${last7.length} of 7 days logged`} />
        <div className="space-y-4">
          {[
            { label: "Calories", v: avg("kcal", last7), t: s.kcal, unit: "kcal", color: "var(--ink)" },
            { label: "Protein", v: avg("protein", last7), t: s.protein, unit: "g", color: "var(--protein)" },
            { label: "Carbs", v: avg("carbs", last7), t: s.carbs, unit: "g", color: "var(--carbs)" },
            { label: "Fat", v: avg("fat", last7), t: s.fat, unit: "g", color: "var(--fat)" },
            { label: "Fibre", v: avg("fiber", last7), t: s.fiber, unit: "g", color: "var(--steps)" },
          ].map((r) => (
            <div key={r.label}>
              <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
                <span className="font-medium text-ink2">{r.label}</span>
                <span className="num">
                  <span className="font-semibold">{int(r.v)}</span>
                  <span className="text-ink3">
                    {" "}
                    / {int(r.t)} {r.unit}
                  </span>
                </span>
              </div>
              <Meter value={r.v} max={r.t} color={r.color} height={5} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="col-span-5">
        <CardHead
          title="Calories"
          sub={eaten.length ? `Within 10% of target on ${onTarget} of ${eaten.length} logged days` : "Nothing logged in this range"}
          right={
            <Segmented
              value={span}
              onChange={setSpan}
              options={[
                { value: 14, label: "14D" },
                { value: 30, label: "30D" },
              ]}
            />
          }
        />
        <Bars
          height={120}
          color="var(--ink-2)"
          overColor="var(--warn)"
          target={s.kcal}
          highlight={day}
          format={(v) => `${int(v)} kcal`}
          labelEvery={span === 30 ? 5 : 1}
          data={days.map((d) => ({ key: d, value: byDay.get(d)?.kcal || null, label: span === 30 ? relativeDay(d).slice(0, 6) : weekdayNarrow(d) }))}
        />
      </Card>

      <Library />
    </div>
  );
}

// ———————————————————————————————————————————————————————————— library

function Library() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Food | "new" | null>(null);
  const foods = useData(() => api.searchFoods(q, 400), [q]) ?? [];
  const { bump, notify } = useStore.getState();

  return (
    <Card className="col-span-12" pad={false}>
      <div className="flex items-center gap-3 px-5 pb-3 pt-5">
        <div>
          <h2 className="label">Food library</h2>
          <p className="mt-1.5 text-[12.5px] text-ink2">Values are per serving. Starter foods are typical averages, so edit them to match your labels.</p>
        </div>
        <div className="ml-auto flex h-[30px] w-64 items-center gap-2 rounded-lg bg-sunk px-2.5">
          <ISearch size={13} className="text-ink3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" className="input-bare text-[12px]" />
        </div>
        <button className="btn btn-outline" onClick={() => setEditing("new")}>
          <IPlus size={13} /> New food
        </button>
      </div>
      <div className="grid grid-cols-[24px_minmax(0,1fr)_150px_70px_60px_60px_60px_64px] items-center gap-x-3 border-y border-line px-5 py-2.5 label">
        <span />
        <span>Name</span>
        <span>Serving</span>
        <span className="text-right">kcal</span>
        <span className="text-right">Protein</span>
        <span className="text-right">Carbs</span>
        <span className="text-right">Fat</span>
        <span />
      </div>
      <div className="scroll max-h-[420px]">
        {foods.map((f) => (
          <div key={f.id} className="row-hover group grid grid-cols-[24px_minmax(0,1fr)_150px_70px_60px_60px_60px_64px] items-center gap-x-3 px-5 py-2 text-[13px]">
            <button
              className="text-ink3"
              style={{ color: f.favorite ? "var(--carbs)" : undefined }}
              onClick={async () => (await api.toggleFavorite(f.id), bump())}
              aria-label="Favourite"
            >
              <IStar size={13} filled={f.favorite} />
            </button>
            <span className="truncate">
              {f.name}
              {f.use_count > 0 && <span className="num ml-2 text-[11px] text-ink3">logged {f.use_count}×</span>}
            </span>
            <span className="truncate text-[12px] text-ink3">{f.serving}</span>
            <span className="num text-right font-medium">{int(f.kcal)}</span>
            <span className="num text-right text-ink2">{dec(f.protein)}</span>
            <span className="num text-right text-ink2">{dec(f.carbs)}</span>
            <span className="num text-right text-ink2">{dec(f.fat)}</span>
            <span className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100">
              <button className="btn btn-icon btn-sm" onClick={() => setEditing(f)} aria-label="Edit">
                <IEdit size={13} />
              </button>
              <button
                className="btn btn-icon btn-sm hover:!text-danger"
                onClick={async () => {
                  await api.deleteFood(f.id);
                  bump();
                  notify(`Removed ${f.name} from library`);
                }}
                aria-label="Delete"
              >
                <ITrash size={13} />
              </button>
            </span>
          </div>
        ))}
      </div>
      {editing && <FoodEditor food={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function FoodEditor({ food, onClose }: { food: Food | null; onClose: () => void }) {
  const [name, setName] = useState(food?.name ?? "");
  const [serving, setServing] = useState(food?.serving ?? "1 serving");
  const [kcal, setKcal] = useState<number | null>(food?.kcal ?? null);
  const [protein, setProtein] = useState<number | null>(food?.protein ?? null);
  const [carbs, setCarbs] = useState<number | null>(food?.carbs ?? null);
  const [fat, setFat] = useState<number | null>(food?.fat ?? null);
  const [fiber, setFiber] = useState<number | null>(food?.fiber ?? null);
  const fromMacros = (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;
  const valid = name.trim() && (kcal != null || fromMacros > 0);

  const save = async () => {
    if (!valid) return;
    await api.saveFood({
      id: food?.id ?? null,
      name,
      serving: serving || "1 serving",
      kcal: kcal ?? Math.round(fromMacros),
      protein: protein ?? 0,
      carbs: carbs ?? 0,
      fat: fat ?? 0,
      fiber: fiber ?? 0,
    });
    useStore.getState().bump();
    onClose();
  };

  return (
    <Sheet
      title={food ? "Edit food" : "New food"}
      onClose={onClose}
      width={560}
      footer={
        <>
          <span className="flex-1 text-[12px] text-ink3">{food ? "Past diary entries keep the values they were logged with." : ""}</span>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => void save()}>
            Save
          </button>
        </>
      }
    >
      <form className="px-5 py-5" onSubmit={(e) => (e.preventDefault(), void save())}>
        <div className="grid grid-cols-[1fr_170px] gap-3">
          <Field label="Name">
            <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Serving">
            <input className="input" value={serving} onChange={(e) => setServing(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3">
          <Field label="Calories" hint={fromMacros > 0 ? `Macros: ${int(fromMacros)}` : undefined}>
            <NumberField value={kcal} onChange={setKcal} stepper={false} />
          </Field>
          <Field label={<Dot color="var(--protein)">Protein</Dot>}>
            <NumberField value={protein} onChange={setProtein} stepper={false} dp={1} suffix="g" />
          </Field>
          <Field label={<Dot color="var(--carbs)">Carbs</Dot>}>
            <NumberField value={carbs} onChange={setCarbs} stepper={false} dp={1} suffix="g" />
          </Field>
          <Field label={<Dot color="var(--fat)">Fat</Dot>}>
            <NumberField value={fat} onChange={setFat} stepper={false} dp={1} suffix="g" />
          </Field>
          <Field label="Fibre">
            <NumberField value={fiber} onChange={setFiber} stepper={false} dp={1} suffix="g" />
          </Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
