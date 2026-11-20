# Tally

A native macOS app for daily fitness tracking: food and macros, workouts and sets, water, steps, sleep, weight and mood, all measured against goals you set. Data stays local, in one SQLite file. No account, no network.

## Run

```bash
npm install
npm run tauri dev      # dev build with hot reload
npm run tauri build    # Tally.app + .dmg in src-tauri/target/release/bundle/
npm run dev            # UI only, in a browser, against an in-memory mock (src/dev/mock.ts)
```

You need Node 18+ and Rust.

## Stack

- **Tauri 2**: a Rust core with a native macOS window (overlay title bar). The app paints its own ambient scene behind a translucent sheet.
- **Rust + rusqlite** (bundled SQLite) owns every query and is exposed as typed commands in `src-tauri/src/lib.rs`. The schema and starter foods are in `db.rs`.
- **React 18 + TypeScript + Tailwind** for the UI. There is no chart library: charts are hand-drawn SVG/CSS in `src/components/charts.tsx`.

## Screens

| Screen    | What it's for |
|-----------|---------------|
| Program   | The coach. An eight-question intake builds calories, macros and a training split. Shows today's session with loads suggested from your history, the training block, weekly sets per muscle, a two-weekly check-in that adjusts calories, and the reasoning behind every number |
| Today     | Calories left with a macro-split bar, protein/carbs/fat, the week strip, a streak, water/steps/sleep/weight tiles, meals, training and a mood/note check-in |
| Food      | **What to eat now**: meal suggestions for the current meal, sized to what's left of the day. Also the day's diary (click any entry to edit its name, amount, meal, calories and macros), 7-day averages, a calorie history, and the food library (edit, favourite, archive) |
| Training  | Click any workout to edit its title, date, type, duration, effort and every set, with a before/after summary and undo. Also: weekly goal ring, minutes per week, history grouped by week, and estimated 1RM progress per exercise |
| Body      | Smoothed weight trend against your goal, weekly rate, projected date, weigh-in log |
| Trends    | Week/month/quarter averages, charts for calories, protein, steps, sleep and water, and a year-long consistency grid |
| Settings  | Nutrition and habit targets, a Mifflin–St Jeor energy calculator, units, and JSON export |

## The coach (`src-tauri/src/coach/`)

A deterministic planner written in Rust. It makes no model calls and uses no randomness: the same answers always produce the same plan, and `cargo test` checks that.

- `nutrition.rs` sets resting energy with Mifflin–St Jeor (or Katch–McArdle when you give a body-fat %), then adds daily movement and training cost. The rate of change scales with goal, pace and training age. Protein is set by goal (from lean mass when known), with fat and carbs filling the rest. Training days get slightly more carbs than rest days.
- `program.rs` picks a split by days per week (full body ×2 or ×3, upper/lower, UL plus PPL, PPL ×2). It fills each movement slot from `library.rs` (80 exercises) given your equipment and joint limits, then spreads weekly set targets across the slots. Focus areas get extra direct sets and an added isolation exercise. Sessions are trimmed to fit the time you have, taking sets from the muscles furthest over their target first. It also builds a training block with reps-in-reserve targets and a deload.
- `checkin.rs` smooths your weigh-ins, fits a least-squares slope to the last 21 days, and compares it with the planned rate. It suggests a calorie change capped at ±250. When enough food is logged, it also estimates your real maintenance.

## Meal suggestions (`src-tauri/src/coach/meals.rs`)

A curated list of about 50 home-cooked dishes, Indian staples included, with typical macros. Tally works out which meal it is from the clock and what you've already logged; at 11:00 with no breakfast, that's breakfast. It gives that meal its share of today's remaining calories and protein, then scores every dish that matches the meal and your diet (any, pescatarian, eggetarian, vegetarian, vegan). The score covers calorie fit, protein fit, protein density weighted by goal (more for a cut), fibre and variety. Dishes from the last three days drop down the list, and no single kind of dish (chicken, say) crowds the top six. Portions scale in quarters to fit. **Log** adds the dish to your diary and keeps it in your food library. **Recipe** opens measured ingredients, scaled to the portion, and a step-by-step method you can tick off as you cook.

## Ambience

The window background is a living scene: Paper, Mist, Dusk, Tide, Graphite or Ember, or **Auto**, which follows the time of day. Turn on **Reactive** and the background warms toward the accent colour as the day's food, protein, water, steps and training fill in. Switch scenes with ⌘B or from the bottom of the sidebar.

## Keys

| Key | Does |
|-----|------|
| ⌘K | Quick log: search a food to add one serving, or run an action |
| F / ⌘N | Log food (meal picked by time of day) |
| W | Log workout |
| ← → or [ ] | Previous / next day |
| T | Jump to today |
| ⌘1 … ⌘7 | Switch screen |
| ⌘B | Next ambience scene |
| ↑ ↓ in number fields | Nudge the value (hold ⇧ for ×10) |

## Notes

- Diary entries copy per-serving values when you log them, so editing a food later doesn't rewrite history.
- Weight is shown as a 0.1-alpha exponential moving average. The weekly rate is a least-squares fit over the last 28 days of that trend.
- The data file is at `~/Library/Application Support/app.tally.desktop/tally.db`.
# Fitness-Tracker-
