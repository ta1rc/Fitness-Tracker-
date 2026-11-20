/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--surface-solid)",
        surface: "var(--surface-solid)",
        sunk: "var(--sunk)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        ink3: "var(--ink-3)",
        line: "var(--line)",
        line2: "var(--line-2)",
        accent: "var(--accent)",
        protein: "var(--protein)",
        carbs: "var(--carbs)",
        fat: "var(--fat)",
        water: "var(--water)",
        sleep: "var(--sleep)",
        steps: "var(--steps)",
        good: "var(--good)",
        warn: "var(--warn)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter", "system-ui", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Inter", "system-ui", "sans-serif"],
        mono: ["SF Mono", "ui-monospace", "Menlo", "monospace"],
      },
      borderRadius: { card: "14px" },
    },
  },
  plugins: [],
};
