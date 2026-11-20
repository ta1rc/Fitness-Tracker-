//! SQLite storage. One file in the app data dir, migrated by `user_version`.
//! All quantities are stored metric (kg, ml, km); the UI converts for display.

use rusqlite::{params, Connection};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const SCHEMA_V1: &str = r#"
CREATE TABLE foods (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL,
  serving      TEXT    NOT NULL DEFAULT '1 serving',
  kcal         REAL    NOT NULL DEFAULT 0,
  protein      REAL    NOT NULL DEFAULT 0,
  carbs        REAL    NOT NULL DEFAULT 0,
  fat          REAL    NOT NULL DEFAULT 0,
  fiber        REAL    NOT NULL DEFAULT 0,
  favorite     INTEGER NOT NULL DEFAULT 0,
  use_count    INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER,
  archived     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);

-- Per-serving values are copied from the food at log time, so editing a food
-- later never rewrites history. Totals are value * qty.
CREATE TABLE entries (
  id         INTEGER PRIMARY KEY,
  day        TEXT    NOT NULL,
  meal       TEXT    NOT NULL CHECK (meal IN ('breakfast','lunch','dinner','snack')),
  food_id    INTEGER REFERENCES foods(id) ON DELETE SET NULL,
  name       TEXT    NOT NULL,
  serving    TEXT    NOT NULL,
  qty        REAL    NOT NULL DEFAULT 1,
  kcal       REAL    NOT NULL,
  protein    REAL    NOT NULL,
  carbs      REAL    NOT NULL,
  fat        REAL    NOT NULL,
  fiber      REAL    NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX entries_day ON entries(day);

CREATE TABLE workouts (
  id           INTEGER PRIMARY KEY,
  day          TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  kind         TEXT    NOT NULL,
  duration_min REAL    NOT NULL DEFAULT 0,
  distance_km  REAL,
  kcal         REAL,
  effort       INTEGER,
  notes        TEXT    NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
);
CREATE INDEX workouts_day ON workouts(day);

CREATE TABLE sets (
  id         INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  exercise   TEXT    NOT NULL,
  reps       INTEGER,
  weight_kg  REAL
);
CREATE INDEX sets_workout ON sets(workout_id);
CREATE INDEX sets_exercise ON sets(exercise COLLATE NOCASE);

CREATE TABLE days (
  day       TEXT PRIMARY KEY,
  water_ml  REAL,
  steps     INTEGER,
  sleep_h   REAL,
  weight_kg REAL,
  body_fat  REAL,
  energy    INTEGER,
  note      TEXT
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
"#;

/// Typical per-serving values (USDA-style averages). A starting point the
/// user is expected to edit to match their own labels.
const STARTER_FOODS: &[(&str, &str, f64, f64, f64, f64, f64)] = &[
    // name, serving, kcal, protein, carbs, fat, fiber
    ("Egg, large", "1 egg (50 g)", 72.0, 6.3, 0.4, 4.8, 0.0),
    ("Egg whites", "100 g", 52.0, 10.9, 0.7, 0.2, 0.0),
    ("Chicken breast, cooked", "100 g", 165.0, 31.0, 0.0, 3.6, 0.0),
    ("Salmon, cooked", "100 g", 206.0, 22.0, 0.0, 12.0, 0.0),
    ("Tuna, canned in water", "100 g", 116.0, 25.5, 0.0, 0.8, 0.0),
    ("Lean ground beef, cooked", "100 g", 217.0, 26.0, 0.0, 11.7, 0.0),
    ("Tofu, firm", "100 g", 144.0, 17.3, 2.8, 8.7, 2.3),
    ("Paneer", "100 g", 265.0, 18.3, 1.2, 20.8, 0.0),
    ("Greek yogurt, plain nonfat", "170 g", 100.0, 17.0, 6.0, 0.7, 0.0),
    ("Cottage cheese, 2%", "100 g", 84.0, 11.0, 4.3, 2.3, 0.0),
    ("Milk, 2%", "1 cup (244 ml)", 122.0, 8.0, 12.0, 4.8, 0.0),
    ("Whey protein", "1 scoop (30 g)", 120.0, 24.0, 3.0, 1.5, 0.0),
    ("Cheddar cheese", "28 g", 114.0, 7.0, 0.4, 9.4, 0.0),
    ("Oats, rolled (dry)", "40 g", 152.0, 5.3, 27.0, 2.6, 4.0),
    ("White rice, cooked", "1 cup (158 g)", 205.0, 4.3, 44.5, 0.4, 0.6),
    ("Brown rice, cooked", "1 cup (195 g)", 218.0, 5.0, 46.0, 1.6, 3.5),
    ("Pasta, cooked", "1 cup (140 g)", 221.0, 8.1, 43.0, 1.3, 2.5),
    ("Quinoa, cooked", "1 cup (185 g)", 222.0, 8.1, 39.4, 3.6, 5.2),
    ("Whole wheat bread", "1 slice (32 g)", 81.0, 4.0, 13.8, 1.1, 1.9),
    ("Roti / chapati", "1 medium (40 g)", 120.0, 3.1, 18.0, 3.7, 1.9),
    ("Dal, cooked", "1 cup (240 g)", 260.0, 13.0, 34.0, 8.0, 9.0),
    ("Idli", "1 piece (40 g)", 58.0, 2.0, 12.0, 0.2, 0.6),
    ("Potato, baked", "1 medium (173 g)", 161.0, 4.3, 36.6, 0.2, 3.8),
    ("Sweet potato, baked", "1 medium (114 g)", 103.0, 2.3, 23.6, 0.2, 3.8),
    ("Lentils, cooked", "1 cup (198 g)", 230.0, 17.9, 39.9, 0.8, 15.6),
    ("Chickpeas, cooked", "1 cup (164 g)", 269.0, 14.5, 45.0, 4.2, 12.5),
    ("Black beans, cooked", "1 cup (172 g)", 227.0, 15.2, 40.8, 0.9, 15.0),
    ("Banana", "1 medium (118 g)", 105.0, 1.3, 27.0, 0.4, 3.1),
    ("Apple", "1 medium (182 g)", 95.0, 0.5, 25.0, 0.3, 4.4),
    ("Orange", "1 medium (131 g)", 62.0, 1.2, 15.4, 0.2, 3.1),
    ("Blueberries", "1 cup (148 g)", 84.0, 1.1, 21.4, 0.5, 3.6),
    ("Avocado", "½ fruit (100 g)", 160.0, 2.0, 8.5, 14.7, 6.7),
    ("Broccoli", "1 cup (91 g)", 31.0, 2.5, 6.0, 0.3, 2.4),
    ("Spinach, raw", "1 cup (30 g)", 7.0, 0.9, 1.1, 0.1, 0.7),
    ("Almonds", "28 g", 164.0, 6.0, 6.1, 14.2, 3.5),
    ("Peanut butter", "2 tbsp (32 g)", 188.0, 8.0, 6.3, 16.0, 1.9),
    ("Hummus", "2 tbsp (30 g)", 70.0, 2.0, 4.0, 5.0, 1.6),
    ("Olive oil", "1 tbsp (13.5 g)", 119.0, 0.0, 0.0, 13.5, 0.0),
    ("Butter", "1 tbsp (14 g)", 102.0, 0.1, 0.0, 11.5, 0.0),
    ("Honey", "1 tbsp (21 g)", 64.0, 0.1, 17.3, 0.0, 0.0),
    ("Dark chocolate, 70%", "20 g", 120.0, 1.6, 9.2, 8.5, 2.2),
    ("Protein bar", "1 bar (60 g)", 210.0, 20.0, 22.0, 7.0, 5.0),
    ("Orange juice", "1 cup (248 ml)", 112.0, 1.7, 25.8, 0.5, 0.5),
    ("Coffee, black", "1 cup (240 ml)", 2.0, 0.3, 0.0, 0.0, 0.0),
];

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;
    if version < 1 {
        conn.execute_batch("BEGIN;")?;
        conn.execute_batch(SCHEMA_V1)?;
        let now = now_ms();
        let mut stmt = conn.prepare(
            "INSERT INTO foods (name, serving, kcal, protein, carbs, fat, fiber, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )?;
        for (name, serving, kcal, p, c, f, fib) in STARTER_FOODS {
            stmt.execute(params![name, serving, kcal, p, c, f, fib, now])?;
        }
        drop(stmt);
        conn.pragma_update(None, "user_version", 1)?;
        conn.execute_batch("COMMIT;")?;
    }
    if version < 2 {
        conn.execute_batch(
            "BEGIN;
             CREATE TABLE plans (
               id         INTEGER PRIMARY KEY,
               created_at INTEGER NOT NULL,
               start_day  TEXT    NOT NULL,
               profile    TEXT    NOT NULL,
               plan       TEXT    NOT NULL,
               active     INTEGER NOT NULL DEFAULT 1
             );
             PRAGMA user_version = 2;
             COMMIT;",
        )?;
    }
    Ok(())
}
