import { create } from "zustand";
import { useEffect, useState } from "react";
import { api, type Entry, type Meal, type Recipe, type Settings, type Workout } from "./api";
import { addDays, today } from "./lib/date";

export type View = "today" | "program" | "nutrition" | "training" | "body" | "trends" | "goals";

export type Sheet =
  | { type: "food"; meal: Meal; day: string }
  | { type: "workout"; day: string; workout?: Workout; template?: Workout }
  | { type: "weigh"; day: string }
  | { type: "entry"; entry: Entry }
  | { type: "recipe"; recipe: Recipe; portion: number; logTo?: { day: string; meal: Meal } };

type Toast = { id: number; text: string; undo?: () => void | Promise<void> };

type State = {
  view: View;
  day: string;
  settings: Settings | null;
  /** Bumped after every write; views refetch when it changes. */
  version: number;
  sheet: Sheet | null;
  palette: boolean;
  toast: Toast | null;
  go: (view: View) => void;
  setDay: (day: string) => void;
  shiftDay: (n: number) => void;
  bump: () => void;
  open: (sheet: Sheet) => void;
  close: () => void;
  setPalette: (open: boolean) => void;
  notify: (text: string, undo?: Toast["undo"]) => void;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
};

export const useStore = create<State>((set, get) => ({
  view: "today",
  day: today(),
  settings: null,
  version: 0,
  sheet: null,
  palette: false,
  toast: null,
  go: (view) => set({ view }),
  setDay: (day) => set({ day: day > today() ? today() : day }),
  shiftDay: (n) => get().setDay(addDays(get().day, n)),
  bump: () => set((s) => ({ version: s.version + 1 })),
  open: (sheet) => set({ sheet, palette: false }),
  close: () => set({ sheet: null }),
  setPalette: (palette) => set({ palette }),
  notify: (text, undo) => {
    const id = Date.now();
    set({ toast: { id, text, undo } });
    setTimeout(() => get().toast?.id === id && set({ toast: null }), undo ? 5000 : 2600);
  },
  updateSettings: async (patch) => {
    const cur = get().settings;
    if (!cur) return;
    const next = { ...cur, ...patch };
    set({ settings: next });
    await api.saveSettings(next);
  },
}));

export const useSettings = () => useStore((s) => s.settings!);

/** Fetch with `fn`, refetching when deps or the store version change. */
export function useData<T>(fn: () => Promise<T>, deps: unknown[]): T | undefined {
  const version = useStore((s) => s.version);
  const [data, setData] = useState<T>();
  useEffect(() => {
    let live = true;
    fn().then((d) => live && setData(d)).catch((e) => console.error(e));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);
  return data;
}
