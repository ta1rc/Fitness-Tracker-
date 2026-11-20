/** Days are local calendar dates as "YYYY-MM-DD" strings everywhere. */

const pad = (n: number) => String(n).padStart(2, "0");

export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDay(new Date());

export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(a).getTime() - parseDay(b).getTime()) / 86_400_000);
}

/** Inclusive list of days from `from` to `to`. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const d = parseDay(day);
  const dow = (d.getDay() + 6) % 7;
  return addDays(day, -dow);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, opts);
const F = {
  long: fmt({ weekday: "long", day: "numeric", month: "long" }),
  dayMonth: fmt({ day: "numeric", month: "short" }),
  dayMonthYear: fmt({ day: "numeric", month: "short", year: "numeric" }),
  weekdayShort: fmt({ weekday: "short" }),
  weekdayNarrow: fmt({ weekday: "narrow" }),
  month: fmt({ month: "short" }),
  monthLong: fmt({ month: "long", year: "numeric" }),
};

export const longDate = (day: string) => F.long.format(parseDay(day));
export const shortDate = (day: string) => {
  const d = parseDay(day);
  return d.getFullYear() === new Date().getFullYear() ? F.dayMonth.format(d) : F.dayMonthYear.format(d);
};
export const weekday = (day: string) => F.weekdayShort.format(parseDay(day));
export const weekdayNarrow = (day: string) => F.weekdayNarrow.format(parseDay(day));
export const monthShort = (day: string) => F.month.format(parseDay(day));
export const monthLong = (day: string) => F.monthLong.format(parseDay(day));

/** "Today", "Yesterday", "Tomorrow", else a weekday or date. */
export function relativeDay(day: string): string {
  const n = diffDays(day, today());
  if (n === 0) return "Today";
  if (n === -1) return "Yesterday";
  if (n === 1) return "Tomorrow";
  if (n > -7 && n < 0) return F.weekdayShort.format(parseDay(day));
  return shortDate(day);
}

/** Meal to suggest by the clock. */
export function mealForNow(): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}

/**
 * The meal to suggest food for right now: the first meal not yet logged whose
 * window has opened. At 11:00 with no breakfast logged, that's breakfast.
 */
export function nextMeal(logged: string[], h = new Date().getHours()): "breakfast" | "lunch" | "dinner" | "snack" {
  const has = (m: string) => logged.includes(m);
  if (h >= 5 && h < 12 && !has("breakfast")) return "breakfast";
  if (h >= 11 && h < 16 && !has("lunch")) return "lunch";
  if (h >= 17 && h < 23 && !has("dinner")) return "dinner";
  return "snack";
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
