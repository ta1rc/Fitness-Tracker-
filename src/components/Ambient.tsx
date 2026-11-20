import { useEffect, useState } from "react";
import { api, totals } from "../api";
import { useData, useSettings } from "../store";
import { today } from "../lib/date";

export type SceneId = "paper" | "mist" | "dusk" | "tide" | "graphite" | "ember";

export const SCENES: { id: SceneId; name: string; tone: "light" | "dark"; colors: [string, string, string, string] }[] = [
  { id: "paper", name: "Paper", tone: "light", colors: ["#ebe6de", "#f2cdb4", "#d9e0e6", "#cf461b"] },
  { id: "mist", name: "Mist", tone: "light", colors: ["#e2e7ea", "#c3dbe0", "#ddd3ea", "#2b55c9"] },
  { id: "dusk", name: "Dusk", tone: "dark", colors: ["#161019", "#5c2c5a", "#9c4a26", "#ff9a62"] },
  { id: "tide", name: "Tide", tone: "dark", colors: ["#091315", "#0d525b", "#163c6a", "#5ee3c3"] },
  { id: "graphite", name: "Graphite", tone: "dark", colors: ["#111111", "#2c2c2c", "#1c2227", "#f1ec66"] },
  { id: "ember", name: "Ember", tone: "dark", colors: ["#170d0a", "#6a1b10", "#a8410f", "#ffb45c"] },
];

/** The scene for the hour: cool morning, paper day, dusk evening, graphite night. */
export function sceneForHour(h: number): SceneId {
  if (h >= 5 && h < 9) return "mist";
  if (h >= 9 && h < 17) return "paper";
  if (h >= 17 && h < 21) return "dusk";
  return "graphite";
}

export function effectiveScene(setting: string, hour = new Date().getHours()): SceneId {
  return SCENES.some((s) => s.id === setting) ? (setting as SceneId) : sceneForHour(hour);
}

/**
 * The living background. Paints the scene, applies its tone to the document,
 * and, when reactive, lets the field warm toward the accent as the day's
 * targets fill in.
 */
export function Ambient() {
  const s = useSettings();
  const [hour, setHour] = useState(new Date().getHours());
  const t = today();
  const day = useData(() => api.getDay(t), [t]);

  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  const scene = effectiveScene(s.scene, hour);
  const tone = SCENES.find((x) => x.id === scene)!.tone;

  let energy = 0;
  if (s.reactive && day) {
    const m = totals(day.entries);
    const f = (v: number, max: number) => (max > 0 ? Math.min(1, v / max) : 0);
    energy =
      0.3 * f(m.kcal, s.kcal) +
      0.25 * f(m.protein, s.protein) +
      0.15 * f(day.metrics.water_ml ?? 0, s.water_ml) +
      0.15 * f(day.metrics.steps ?? 0, s.steps) +
      0.15 * (day.workouts.length > 0 ? 1 : 0);
  }

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.scene = scene;
    el.dataset.tone = tone;
  }, [scene, tone]);
  useEffect(() => {
    document.documentElement.style.setProperty("--energy", energy.toFixed(3));
  }, [energy]);

  return (
    <div className="ambient" aria-hidden>
      <i className="blob b1" />
      <i className="blob b2" />
      <i className="blob b3" />
      <div className="grain" />
    </div>
  );
}

/** Small round preview of a scene. */
export function Swatch({ id, size = 18 }: { id: SceneId | "auto"; size?: number }) {
  if (id === "auto") {
    const ids: SceneId[] = ["mist", "paper", "dusk", "graphite"];
    return (
      <span className="relative block overflow-hidden rounded-full" style={{ width: size, height: size }}>
        {ids.map((sid, i) => {
          const c = SCENES.find((x) => x.id === sid)!.colors;
          return (
            <span
              key={sid}
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${c[1]}, ${c[2]})`, clipPath: `polygon(50% 50%, ${["0 0, 100% 0", "100% 0, 100% 100%", "100% 100%, 0 100%", "0 100%, 0 0"][i]})` }}
            />
          );
        })}
      </span>
    );
  }
  const c = SCENES.find((x) => x.id === id)!.colors;
  return (
    <span
      className="block rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${c[1]}, transparent 70%), radial-gradient(circle at 75% 70%, ${c[2]}, transparent 70%), ${c[0]}`,
        boxShadow: `inset 0 0 0 1px rgb(127 127 127 / 0.25), inset -${size / 6}px -${size / 6}px 0 -${size / 4}px ${c[3]}`,
      }}
    />
  );
}
