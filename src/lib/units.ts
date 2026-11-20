import type { Settings } from "../api";

type U = Settings["units"];

const KG_LB = 2.2046226218;
const KM_MI = 0.621371;
const ML_OZ = 0.033814;

export const weightUnit = (u: U) => (u === "imperial" ? "lb" : "kg");
export const distUnit = (u: U) => (u === "imperial" ? "mi" : "km");
export const waterUnit = (u: U) => (u === "imperial" ? "fl oz" : "ml");

export const kgTo = (kg: number, u: U) => (u === "imperial" ? kg * KG_LB : kg);
export const toKg = (v: number, u: U) => (u === "imperial" ? v / KG_LB : v);
export const kmTo = (km: number, u: U) => (u === "imperial" ? km * KM_MI : km);
export const toKm = (v: number, u: U) => (u === "imperial" ? v / KM_MI : v);
export const mlTo = (ml: number, u: U) => (u === "imperial" ? ml * ML_OZ : ml);
export const toMl = (v: number, u: U) => (u === "imperial" ? v / ML_OZ : v);

/** One glass: 250 ml or 8 fl oz. */
export const glassMl = (u: U) => (u === "imperial" ? 8 / ML_OZ : 250);

export const round = (v: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
export const int = (v: number) => nf.format(Math.round(v));
export const dec = (v: number) => nf1.format(round(v, 1));
const nfw = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Body weight always shows one decimal, so 81.0 doesn't read as 81. */
export const wt = (kg: number, u: U) => nfw.format(round(kgTo(kg, u), 1));

export const fmtWeight = (kg: number, u: U) => `${wt(kg, u)} ${weightUnit(u)}`;
export const fmtWater = (ml: number, u: U) =>
  u === "imperial" ? `${int(mlTo(ml, u))} fl oz` : ml >= 1000 ? `${dec(ml / 1000)} L` : `${int(ml)} ml`;

export function fmtDuration(min: number): string {
  if (!min) return "0 min";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function fmtSleep(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h ${mm}m` : `${hh}h`;
}

/** 1.25 → "1¼", 0.5 → "½"; anything off the quarter grid falls back to a decimal. */
export function fraction(v: number): string {
  const whole = Math.floor(v + 1e-9);
  const quarters = Math.round((v - whole) * 4);
  if (Math.abs(v - whole - quarters / 4) > 0.01) return dec(v);
  if (quarters === 4) return String(whole + 1);
  const frac = ["", "¼", "½", "¾"][quarters];
  return whole ? `${whole}${frac}` : frac || "0";
}

const PLURAL: Record<string, string> = { slice: "slices", scoop: "scoops", cup: "cups" };

/** An ingredient quantity scaled by `mult`: weights to sensible steps, counts to quarters. */
export function amount(qty: number, unit: string, mult: number): string {
  if (!qty) return "";
  const v = qty * mult;
  if (unit === "g" || unit === "ml") return `${v < 20 ? Math.round(v) : Math.round(v / 5) * 5} ${unit}`;
  const n = fraction(Math.round(v * 4) / 4 || 0.25);
  const u = v > 1 && PLURAL[unit] ? PLURAL[unit] : unit;
  return u ? `${n} ${u}` : n;
}
