import { useEffect, useState } from "react";
import { api, type Settings } from "../api";
import { useData, useSettings, useStore } from "../store";
import { today } from "../lib/date";
import { ACTIVITY, suggestPlan } from "../lib/energy";
import { dec, wt, glassMl, int, kgTo, mlTo, round, toKg, toMl, weightUnit } from "../lib/units";
import { Card, CardHead, Field, NumberField, Segmented } from "../components/ui";
import { IExport } from "../components/icons";
import { Dot } from "./FoodSheet";

export function Goals() {
  const s = useSettings();
  const update = useStore((x) => x.updateSettings);
  const weights = useData(() => api.weightSeries(), []) ?? [];
  const path = useData(() => api.dataPath(), []);
  const latest = weights.length ? weights[weights.length - 1][1] : null;
  const plan = latest != null ? suggestPlan(s, latest) : null;
  const macroKcal = s.protein * 4 + s.carbs * 4 + s.fat * 9;
  const gap = macroKcal - s.kcal;
  const wu = weightUnit(s.units);

  const set = <K extends keyof Settings>(k: K) => (v: Settings[K] | null) => v != null && void update({ [k]: v } as Partial<Settings>);

  return (
    <div className="stagger sheet grid grid-cols-12">
      <Card className="col-span-7">
        <CardHead title="Daily nutrition" sub="What a good day looks like. Every screen measures against these." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Calories">
            <NumberField value={s.kcal} onChange={set("kcal")} step={50} suffix="kcal" size="lg" />
          </Field>
          <Field label="Fibre">
            <NumberField value={s.fiber} onChange={set("fiber")} step={1} suffix="g" size="lg" />
          </Field>
          <Field label={<Dot color="var(--protein)">Protein</Dot>} hint={`${int(s.protein * 4)} kcal${latest ? ` · ${dec(s.protein / latest)} g per kg` : ""}`}>
            <NumberField value={s.protein} onChange={set("protein")} step={5} suffix="g" />
          </Field>
          <Field label={<Dot color="var(--carbs)">Carbs</Dot>} hint={`${int(s.carbs * 4)} kcal`}>
            <NumberField value={s.carbs} onChange={set("carbs")} step={5} suffix="g" />
          </Field>
          <Field label={<Dot color="var(--fat)">Fat</Dot>} hint={`${int(s.fat * 9)} kcal`}>
            <NumberField value={s.fat} onChange={set("fat")} step={5} suffix="g" />
          </Field>
          <div className="flex flex-col justify-end">
            <MacroSplit p={s.protein * 4} c={s.carbs * 4} f={s.fat * 9} />
            <p className="num mt-2 text-[11px]" style={{ color: Math.abs(gap) > 50 ? "var(--warn)" : "var(--ink-3)" }}>
              Macros add up to {int(macroKcal)} kcal
              {Math.abs(gap) > 50 ? ` · ${int(Math.abs(gap))} ${gap > 0 ? "over" : "under"} the calorie target` : " · matches the target"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="col-span-5">
        <CardHead title="Daily habits" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Water" hint={`${Math.round(s.water_ml / glassMl(s.units))} glasses`}>
            <NumberField
              value={round(mlTo(s.water_ml, s.units))}
              onChange={(v) => v != null && void update({ water_ml: toMl(v, s.units) })}
              step={s.units === "imperial" ? 8 : 250}
              suffix={s.units === "imperial" ? "fl oz" : "ml"}
            />
          </Field>
          <Field label="Steps">
            <NumberField value={s.steps} onChange={set("steps")} step={500} />
          </Field>
          <Field label="Sleep">
            <NumberField value={s.sleep_h} onChange={set("sleep_h")} step={0.5} dp={1} suffix="h" />
          </Field>
          <Field label="Workouts per week">
            <NumberField value={s.workouts_per_week} onChange={set("workouts_per_week")} step={1} max={14} />
          </Field>
          <Field label="Goal weight" className="col-span-2" hint={latest != null ? `Latest weigh-in ${wt(latest, s.units)} ${wu}` : "Log a weigh-in on Body to compare"}>
            <NumberField
              value={s.goal_weight_kg == null ? null : round(kgTo(s.goal_weight_kg, s.units), 1)}
              onChange={(v) => void update({ goal_weight_kg: v == null ? null : toKg(v, s.units) })}
              step={0.5}
              dp={1}
              suffix={wu}
            />
          </Field>
        </div>
      </Card>

      <Card className="col-span-7">
        <CardHead title="Energy calculator" sub="Mifflin–St Jeor estimate. A starting point: adjust after two or three weeks of real data." />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Sex">
            <Segmented
              value={s.sex}
              onChange={(v) => void update({ sex: v })}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Field>
          <Field label="Birth year">
            <NumberField value={s.birth_year} onChange={(v) => void update({ birth_year: v })} step={1} min={1900} max={new Date().getFullYear()} stepper={false} placeholder="1995" />
          </Field>
          <Field label="Height" hint={s.units === "imperial" && s.height_cm ? `${Math.floor(s.height_cm / 30.48)}′ ${Math.round((s.height_cm / 2.54) % 12)}″` : undefined}>
            <NumberField value={s.height_cm} onChange={(v) => void update({ height_cm: v })} step={1} suffix="cm" stepper={false} placeholder="175" />
          </Field>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[12px] font-medium text-ink2">Activity</span>
          <div className="grid grid-cols-5 gap-1.5">
            {ACTIVITY.map((a) => (
              <button
                key={a.v}
                onClick={() => void update({ activity: a.v })}
                className="rounded-lg px-2.5 py-2 text-left transition-colors"
                style={s.activity === a.v ? { background: "var(--ink)", color: "var(--surface-solid)" } : { background: "var(--sunk)" }}
              >
                <span className="block text-[12px] font-medium">{a.label}</span>
                <span className="block text-[10px] leading-snug opacity-60">{a.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[12px] font-medium text-ink2">Pace</span>
          <Segmented
            value={s.pace_kg_week}
            onChange={(v) => void update({ pace_kg_week: v })}
            options={[-0.75, -0.5, -0.25, 0, 0.25, 0.5].map((v) => ({
              value: v,
              label: v === 0 ? "Maintain" : `${v > 0 ? "+" : "−"}${+Math.abs(kgTo(v, s.units)).toFixed(2)} ${wu}/wk`,
            }))}
          />
        </div>

        <div className="mt-5 rounded-xl bg-sunk p-4">
          {plan ? (
            <div className="flex flex-col gap-4">
              <div className="num grid flex-1 grid-cols-[repeat(5,auto)] justify-between gap-x-4 gap-y-3">
                <Out label="Resting" value={int(plan.bmr)} unit="kcal" />
                <Out label="Maintenance" value={int(plan.tdee)} unit="kcal" />
                <Out label="Target" value={int(plan.kcal)} unit="kcal" strong />
                <Out label="Protein" value={int(plan.protein)} unit="g" />
                <Out label="Carbs / Fat" value={`${int(plan.carbs)}/${int(plan.fat)}`} unit="g" />
              </div>
              <button className="btn btn-accent self-start" onClick={() => void update({ kcal: plan.kcal, protein: plan.protein, carbs: plan.carbs, fat: plan.fat })}>
                Use these
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-ink2">Fill in birth year and height, and log a weigh-in, to get a suggestion.</p>
          )}
        </div>
      </Card>

      <div className="stack col-span-5">
        <Card>
          <CardHead title="Preferences" />
          <div className="space-y-4">
            <Field label="Your name" hint="Used in the greeting, nothing else">
              <NameInput value={s.name} onSave={(name) => void update({ name })} />
            </Field>
            <Field label="Units">
              <Segmented
                value={s.units}
                onChange={(v) => void update({ units: v })}
                options={[
                  { value: "metric", label: "Metric · kg, km, ml" },
                  { value: "imperial", label: "Imperial · lb, mi, fl oz" },
                ]}
              />
            </Field>
          </div>
        </Card>
        <DataCard path={path} />
      </div>
    </div>
  );
}

function MacroSplit({ p, c, f }: { p: number; c: number; f: number }) {
  const t = p + c + f || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        <div className="bar-grow" style={{ width: `${(p / t) * 100}%`, background: "var(--protein)" }} />
        <div className="bar-grow" style={{ width: `${(c / t) * 100}%`, background: "var(--carbs)" }} />
        <div className="bar-grow" style={{ width: `${(f / t) * 100}%`, background: "var(--fat)" }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-[11px] text-ink3">
        <span>P {Math.round((p / t) * 100)}%</span>
        <span>C {Math.round((c / t) * 100)}%</span>
        <span>F {Math.round((f / t) * 100)}%</span>
      </div>
    </div>
  );
}

function Out({ label, value, unit, strong }: { label: string; value: string; unit: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-ink3">{label}</div>
      <div className={`mt-0.5 ${strong ? "text-[18px] font-semibold text-accent" : "text-[15px] font-semibold"}`}>
        {value}
        <span className="ml-0.5 text-[11px] font-normal text-ink3">{unit}</span>
      </div>
    </div>
  );
}

function NameInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return <input className="input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v.trim())} placeholder="Optional" />;
}

function DataCard({ path }: { path?: string }) {
  const notify = useStore((x) => x.notify);
  return (
    <Card>
      <CardHead title="Your data" sub="Everything stays on this Mac in one SQLite file. No account, no network." />
      <div className="break-all rounded-lg bg-sunk px-3 py-2 font-mono text-[11px] text-ink2">{path ?? "…"}</div>
      <div className="mt-3 flex gap-2">
        <button
          className="btn btn-outline"
          onClick={async () => {
            const p = await api.exportData(today());
            notify("Exported to Downloads");
            void api.revealPath(p);
          }}
        >
          <IExport size={13} /> Export JSON
        </button>
        {path && (
          <button className="btn" onClick={() => void api.revealPath(path)}>
            Show in Finder
          </button>
        )}
      </div>
    </Card>
  );
}
