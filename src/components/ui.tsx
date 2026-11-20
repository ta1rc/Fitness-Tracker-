import { useEffect, useRef, useState, type ReactNode } from "react";
import { IClose } from "./icons";

/** A cell in the page's hairline grid. */
export function Card({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <section className={`cell ${pad ? "" : "!p-0"} ${className}`}>{children}</section>;
}

export function CardHead({ title, right, sub, index }: { title: ReactNode; right?: ReactNode; sub?: ReactNode; index?: string }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="label flex items-center gap-2">
          {index && <span className="opacity-60">{index}</span>}
          {title}
        </h2>
        {sub && <p className="mt-1.5 text-[12.5px] leading-snug text-ink2">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`seg ${className}`} role="group">
      {options.map((o) => (
        <button key={String(o.value)} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A hairline progress rule. `over` turns overflow past 100% into a warning. */
export function Meter({ value, max, color, height = 3, over = false }: { value: number; max: number; color: string; height?: number; over?: boolean }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const exceeded = over && value > max;
  return (
    <div className="relative w-full overflow-hidden rounded-full" style={{ height, background: "var(--line)" }}>
      <div className="bar-grow absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct * 100}%`, background: exceeded ? "var(--danger)" : color }} />
    </div>
  );
}

/**
 * A number on a rule. Type into it, nudge with − / +, or ↑/↓ (⇧ for ×10).
 * Empty means null.
 */
export function NumberField({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  placeholder,
  dp = 0,
  className = "",
  autoFocus,
  stepper = true,
  onEnter,
  size = "md",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
  dp?: number;
  className?: string;
  autoFocus?: boolean;
  stepper?: boolean;
  onEnter?: () => void;
  size?: "md" | "lg" | "xl";
}) {
  const fmt = (v: number | null) => (v == null ? "" : String(Math.round(v * 10 ** dp) / 10 ** dp));
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min, v));
  const nudge = (dir: number, mult = 1) => {
    const next = clamp(Math.round(((value ?? 0) + dir * step * mult) * 1000) / 1000);
    onChange(next);
    setText(fmt(next));
  };
  const h = size === "xl" ? "h-14" : size === "lg" ? "h-11" : "h-[34px]";
  const fs = size === "xl" ? "display text-[34px]" : size === "lg" ? "display text-[22px]" : "text-[14px] font-medium";

  return (
    <div className={`group flex items-center ${h} ${className}`} style={{ boxShadow: "inset 0 -1px 0 var(--line-2)" }}>
      {stepper && (
        <button tabIndex={-1} className="mono flex h-full w-6 shrink-0 items-center justify-start text-[14px] text-ink3 hover:text-ink" onClick={() => nudge(-1)} aria-label="Decrease">
          −
        </button>
      )}
      <input
        autoFocus={autoFocus}
        inputMode="decimal"
        value={text}
        placeholder={placeholder ?? "—"}
        onFocus={(e) => ((focused.current = true), e.currentTarget.select())}
        onBlur={() => ((focused.current = false), setText(fmt(value)))}
        onChange={(e) => {
          const t = e.target.value.replace(",", ".");
          if (!/^\d*\.?\d*$/.test(t)) return;
          setText(t);
          onChange(t === "" || t === "." ? null : clamp(Number(t)));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") e.preventDefault(), nudge(1, e.shiftKey ? 10 : 1);
          if (e.key === "ArrowDown") e.preventDefault(), nudge(-1, e.shiftKey ? 10 : 1);
          if (e.key === "Enter" && onEnter) e.preventDefault(), onEnter();
        }}
        className={`num input-bare min-w-0 flex-1 ${stepper ? "text-center" : "text-left"} ${fs}`}
      />
      {suffix && <span className="mono pointer-events-none shrink-0 pl-1 text-[11px] text-ink3">{suffix}</span>}
      {stepper && (
        <button tabIndex={-1} className="mono flex h-full w-6 shrink-0 items-center justify-end text-[14px] text-ink3 hover:text-ink" onClick={() => nudge(1)} aria-label="Increase">
          +
        </button>
      )}
    </div>
  );
}

export function Field({ label, children, hint, className = "" }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] text-ink3">{hint}</span>}
    </label>
  );
}

/** Modal sheet. Esc or a backdrop click closes it. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  width = 560,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onClose());
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div className="anim-fade fixed inset-0 z-40 flex items-start justify-center pt-[8vh]" style={{ background: "rgb(10 8 6 / 0.32)" }} onMouseDown={onClose}>
      <div
        className="anim-pop flex max-h-[82vh] flex-col overflow-hidden rounded-[18px]"
        style={{ width, background: "var(--surface-solid)", boxShadow: "var(--shadow-pop)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex h-14 shrink-0 items-center justify-between pl-6 pr-4" style={{ boxShadow: "0 1px 0 var(--line)" }}>
          <h2 className="title text-[16px]">{title}</h2>
          <button className="btn btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <IClose size={13} />
          </button>
        </header>
        <div className="scroll min-h-0 flex-1">{children}</div>
        {footer && (
          <footer className="flex shrink-0 items-center gap-2 px-6 py-3.5" style={{ boxShadow: "0 -1px 0 var(--line)" }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start py-1">
      <p className="text-[13.5px] text-ink2">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink3">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}

/** Large light figure with a small mono unit: how every headline number is set. */
export function Figure({ value, unit, size = 30, className = "" }: { value: ReactNode; unit?: ReactNode; size?: number; className?: string }) {
  return (
    <span className={`num display inline-flex items-baseline gap-1.5 ${className}`} style={{ fontSize: size, lineHeight: 1 }}>
      {value}
      {unit && <span className="mono text-[11px] font-normal tracking-normal text-ink3">{unit}</span>}
    </span>
  );
}

export function Delta({ value, unit = "", invert = false, dp = 1 }: { value: number | null; unit?: string; invert?: boolean; dp?: number }) {
  if (value == null || !isFinite(value)) return <span className="text-ink3">—</span>;
  const r = Math.round(value * 10 ** dp) / 10 ** dp;
  if (r === 0) return <span className="num text-ink3">±0{unit}</span>;
  const good = invert ? r < 0 : r > 0;
  return (
    <span className="num" style={{ color: good ? "var(--good)" : "var(--ink-2)" }}>
      {r > 0 ? "+" : "−"}
      {Math.abs(r)}
      {unit}
    </span>
  );
}
