import { useEffect, useState } from "react";
import { api, KINDS, type WorkSet, type Workout, type WorkoutInput, type WorkoutKind } from "../api";
import { useData, useSettings, useStore } from "../store";
import { relativeDay, today } from "../lib/date";
import { dec, distUnit, fmtDuration, int, kgTo, kmTo, round, toKg, toKm, weightUnit } from "../lib/units";
import { NumberField, Segmented, Sheet } from "../components/ui";
import { IClose, IPlus, IRepeat, ITrash } from "../components/icons";

type Row = { reps: number | null; weight: number | null };
type Block = { key: number; exercise: string; rows: Row[] };

let keySeq = 1;

function toBlocks(sets: WorkSet[], units: "metric" | "imperial"): Block[] {
  const out: Block[] = [];
  for (const s of sets) {
    const last = out[out.length - 1];
    const row = { reps: s.reps, weight: s.weight_kg == null ? null : round(kgTo(s.weight_kg, units), 1) };
    if (last && last.exercise.toLowerCase() === s.exercise.toLowerCase()) last.rows.push(row);
    else out.push({ key: keySeq++, exercise: s.exercise, rows: [row] });
  }
  return out;
}

const volumeKg = (sets: WorkSet[]) => sets.reduce((a, x) => a + (x.reps ?? 0) * (x.weight_kg ?? 0), 0);
const toInput = (w: Workout): WorkoutInput => {
  const { created_at: _c, ...rest } = w;
  return rest;
};

/** Log or edit a workout: what, how long, how hard, and every set. */
export function WorkoutSheet({ day, workout, template }: { day: string; workout?: Workout; template?: Workout }) {
  const s = useSettings();
  const { close, bump, notify } = useStore.getState();
  const src = workout ?? template;
  const [date, setDate] = useState(workout?.day ?? day);
  const [title, setTitle] = useState(src?.title ?? "");
  const [kind, setKind] = useState<WorkoutKind>(src?.kind ?? "strength");
  const [duration, setDuration] = useState<number | null>(src?.duration_min ?? 45);
  const [distance, setDistance] = useState<number | null>(src?.distance_km == null ? null : round(kmTo(src.distance_km, s.units), 2));
  const [kcal, setKcal] = useState<number | null>(src?.kcal ?? null);
  const [effort, setEffort] = useState<number | null>(src?.effort ?? null);
  const [notes, setNotes] = useState(workout?.notes ?? "");
  const [blocks, setBlocks] = useState<Block[]>(() => (src ? toBlocks(src.sets, s.units) : []));
  const recent = useData(() => api.recentWorkouts(6), []) ?? [];
  const names = useData(() => api.exerciseNames(), []) ?? [];

  const cardio = KINDS.find((k) => k.id === kind)?.cardio ?? false;
  const showSets = kind === "strength" || kind === "hiit";
  const valid = (duration ?? 0) > 0;
  const wu = weightUnit(s.units);

  const applyTemplate = (t: Workout) => {
    setTitle(t.title);
    setKind(t.kind);
    setDuration(t.duration_min);
    setDistance(t.distance_km == null ? null : round(kmTo(t.distance_km, s.units), 2));
    setEffort(t.effort);
    setBlocks(toBlocks(t.sets, s.units));
  };

  const updateBlock = (key: number, f: (b: Block) => Block) => setBlocks((bs) => bs.map((b) => (b.key === key ? f(b) : b)));

  const sets: WorkSet[] = showSets
    ? blocks.flatMap((b) => (b.exercise.trim() ? b.rows.map((r) => ({ exercise: b.exercise.trim(), reps: r.reps, weight_kg: r.weight == null ? null : toKg(r.weight, s.units) })) : []))
    : [];

  const draft = (id: number | null, onDay: string): WorkoutInput => ({
    id,
    day: onDay,
    title: title.trim() || KINDS.find((k) => k.id === kind)!.label,
    kind,
    duration_min: duration ?? 0,
    distance_km: cardio && distance != null ? toKm(distance, s.units) : null,
    kcal,
    effort,
    notes: notes.trim(),
    sets,
  });

  const save = async () => {
    if (!valid) return;
    await api.saveWorkout(draft(workout?.id ?? null, date));
    bump();
    close();
    if (workout) {
      notify(`Updated ${title.trim() || "workout"}`, async () => {
        await api.saveWorkout(toInput(workout));
        useStore.getState().bump();
      });
    } else notify("Workout logged");
  };

  const repeatToday = async () => {
    await api.saveWorkout(draft(null, today()));
    bump();
    close();
    notify(`Logged ${title.trim() || "workout"} again for today`);
  };

  const remove = async () => {
    if (!workout) return;
    await api.deleteWorkout(workout.id);
    bump();
    close();
    notify("Workout deleted", async () => {
      await api.saveWorkout({ ...toInput(workout), id: null });
      useStore.getState().bump();
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Enter" && e.metaKey && (e.preventDefault(), void save());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Before → after, for edits.
  const before = workout && { sets: workout.sets.length, volume: volumeKg(workout.sets), minutes: workout.duration_min };
  const after = { sets: sets.length, volume: volumeKg(sets), minutes: duration ?? 0 };

  return (
    <Sheet
      title={
        <span className="flex items-baseline gap-3">
          {workout ? "Edit workout" : "Log workout"}
          <span className="mono text-[10.5px] font-normal uppercase tracking-[0.06em] text-ink3">{relativeDay(date)}</span>
        </span>
      }
      onClose={close}
      width={720}
      footer={
        <>
          {workout && (
            <button className="btn -ml-3 text-danger hover:!text-danger" onClick={() => void remove()}>
              <ITrash size={13} /> Delete
            </button>
          )}
          {workout && workout.day !== today() && (
            <button className="btn" onClick={() => void repeatToday()} title="Log a copy of this workout for today">
              <IRepeat size={12} /> Repeat today
            </button>
          )}
          <span className="flex-1" />
          <span className="mono mr-2 text-[10px] text-ink3">⌘↵ SAVE</span>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => void save()}>
            {workout ? "Save changes" : "Save workout"}
          </button>
        </>
      }
    >
      <div className="px-6 pb-7 pt-6">
        {!workout && recent.length > 0 && (
          <div className="mb-6">
            <div className="label mb-2">Repeat a recent one</div>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((r) => (
                <button key={r.id} className="btn btn-sm btn-outline" onClick={() => applyTemplate(r)}>
                  <IRepeat size={11} className="text-ink3" />
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* What */}
        <div className="grid grid-cols-[1fr_170px] gap-6">
          <label className="block">
            <span className="label mb-1 block">Title</span>
            <input autoFocus={!src} className="input !h-10 !text-[17px] font-medium" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Push day, Easy 5k, Leg day…" />
          </label>
          <label className="block">
            <span className="label mb-1 block">Date</span>
            <input type="date" className="input !h-10" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        </div>
        <div className="mt-5">
          <span className="label mb-1 block">Type</span>
          <Segmented className="h-9 flex-wrap items-center" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k.id, label: k.label }))} />
        </div>

        {/* How long, how hard */}
        <div className={`mt-6 grid gap-6 ${cardio ? "grid-cols-[1fr_1fr_1fr_1.4fr]" : "grid-cols-[1fr_1fr_1.4fr]"}`}>
          <label className="block">
            <span className="label mb-1 block">Duration</span>
            <NumberField value={duration} onChange={setDuration} step={5} suffix="min" stepper={false} size="lg" />
          </label>
          {cardio && (
            <label className="block">
              <span className="label mb-1 block">Distance</span>
              <NumberField value={distance} onChange={setDistance} step={0.5} dp={2} suffix={distUnit(s.units)} stepper={false} size="lg" />
            </label>
          )}
          <label className="block">
            <span className="label mb-1 block">Active kcal</span>
            <NumberField value={kcal} onChange={setKcal} step={10} suffix="kcal" stepper={false} size="lg" placeholder="—" />
          </label>
          <div>
            <span className="label mb-1 flex justify-between">
              <span>Effort</span>
              <span className="normal-case tracking-normal text-ink2">{effort ? `${effort}/10 · ${EFFORT[effort - 1]}` : "How hard, 1–10"}</span>
            </span>
            <div className="flex h-11 items-end gap-[3px]">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setEffort(effort === n ? null : n)}
                  className="flex-1 rounded-[3px] transition-colors"
                  style={{ height: 12 + n * 2.6, background: effort != null && n <= effort ? "var(--accent)" : "var(--line-2)" }}
                  aria-label={`Effort ${n}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sets */}
        {showSets && (
          <div className="mt-8 pt-6" style={{ boxShadow: "0 -1px 0 var(--line)" }}>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="label">Exercises</span>
              <span className="mono text-[10.5px] text-ink3">WEIGHTS IN {wu.toUpperCase()}</span>
            </div>
            <datalist id="exercise-names">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="space-y-3">
              {blocks.map((b, bi) => {
                const vol = b.rows.reduce((a, r) => a + (r.reps ?? 0) * (r.weight ?? 0), 0);
                return (
                  <div key={b.key} className="anim-fade rounded-[12px] px-4 pb-3 pt-3" style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}>
                    <div className="flex items-center gap-3">
                      <span className="mono w-5 text-[11px]" style={{ color: "var(--accent)" }}>
                        {String(bi + 1).padStart(2, "0")}
                      </span>
                      <input
                        list="exercise-names"
                        autoFocus={!b.exercise}
                        className="input-bare flex-1 text-[15px] font-medium"
                        value={b.exercise}
                        placeholder="Exercise name"
                        onChange={(e) => updateBlock(b.key, (x) => ({ ...x, exercise: e.target.value }))}
                      />
                      <span className="mono num text-[10.5px] text-ink3">
                        {b.rows.length} SETS{vol > 0 && ` · ${int(vol)} ${wu.toUpperCase()}`}
                      </span>
                      <button className="btn btn-icon btn-sm text-ink3" onClick={() => setBlocks((bs) => bs.filter((x) => x.key !== b.key))} aria-label="Remove exercise">
                        <ITrash size={12} />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-[32px_1fr_1fr_24px] items-center gap-x-6 pl-8">
                      <span className="label !text-[9.5px]">Set</span>
                      <span className="label !text-[9.5px]">Reps</span>
                      <span className="label !text-[9.5px]">Weight</span>
                      <span />
                      {b.rows.map((r, ri) => (
                        <SetRow
                          key={ri}
                          n={ri + 1}
                          row={r}
                          unit={wu}
                          onChange={(row) => updateBlock(b.key, (x) => ({ ...x, rows: x.rows.map((rr, i) => (i === ri ? row : rr)) }))}
                          onRemove={() => updateBlock(b.key, (x) => ({ ...x, rows: x.rows.filter((_, i) => i !== ri) }))}
                        />
                      ))}
                    </div>
                    <button
                      className="btn btn-sm ml-5 mt-1 text-ink3"
                      onClick={() => updateBlock(b.key, (x) => ({ ...x, rows: [...x.rows, { ...(x.rows[x.rows.length - 1] ?? { reps: 10, weight: null }) }] }))}
                    >
                      <IPlus size={11} /> Add set
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-outline mt-3 w-full justify-center"
              onClick={() => setBlocks((bs) => [...bs, { key: keySeq++, exercise: "", rows: [{ reps: 10, weight: null }, { reps: 10, weight: null }, { reps: 10, weight: null }] }])}
            >
              <IPlus size={12} /> Add exercise
            </button>
          </div>
        )}

        <label className="mt-7 block">
          <span className="label mb-1 block">Notes</span>
          <textarea className="input !h-auto min-h-[56px] resize-none leading-relaxed" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How it felt, what to change next time" />
        </label>

        {/* Before → after */}
        {before && (
          <div className="mt-6 grid grid-cols-3 gap-6 rounded-[12px] px-5 py-4" style={{ background: "var(--sunk)" }}>
            <Change label="Duration" before={fmtDuration(before.minutes)} after={fmtDuration(after.minutes)} delta={after.minutes - before.minutes} unit="min" />
            <Change label="Sets" before={String(before.sets)} after={String(after.sets)} delta={after.sets - before.sets} />
            <Change
              label="Volume"
              before={`${int(kgTo(before.volume, s.units))} ${wu}`}
              after={`${int(kgTo(after.volume, s.units))} ${wu}`}
              delta={kgTo(after.volume - before.volume, s.units)}
              unit={wu}
            />
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Change({ label, before, after, delta, unit = "" }: { label: string; before: string; after: string; delta: number; unit?: string }) {
  const same = Math.abs(delta) < 0.5;
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num mt-1.5 text-[17px]">{after}</div>
      <div className="mono mt-0.5 text-[10px] uppercase text-ink3">
        {same ? "No change" : `Was ${before} · ${delta > 0 ? "+" : "−"}${dec(Math.abs(delta))}${unit ? ` ${unit}` : ""}`}
      </div>
    </div>
  );
}

const EFFORT = ["Very easy", "Easy", "Easy", "Moderate", "Moderate", "Hard-ish", "Hard", "Very hard", "Near max", "All out"];

function SetRow({ n, row, unit, onChange, onRemove }: { n: number; row: Row; unit: string; onChange: (r: Row) => void; onRemove: () => void }) {
  return (
    <>
      <span className="mono num text-[11px] text-ink3">{n}</span>
      <NumberField value={row.reps} onChange={(reps) => onChange({ ...row, reps })} step={1} className="!h-9" />
      <NumberField value={row.weight} onChange={(weight) => onChange({ ...row, weight })} step={2.5} dp={1} suffix={unit} className="!h-9" />
      <button tabIndex={-1} className="flex h-9 items-center justify-center text-ink3 hover:text-ink" onClick={onRemove} aria-label="Remove set">
        <IClose size={11} />
      </button>
    </>
  );
}
