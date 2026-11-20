//! The coach: a deterministic bodybuilding planner.
//!
//! Profile in, plan out. No randomness, no model calls: the same answers always
//! produce the same plan, and every number can be traced to a rule in
//! `nutrition.rs` or `program.rs`. `checkin.rs` adapts calories to what the
//! scale actually does.

pub mod checkin;
pub mod library;
pub mod meals;
pub mod nutrition;
pub mod program;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Sex {
    Male,
    Female,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Goal {
    /// Lose fat, keep muscle.
    Cut,
    /// Lose a little fat while building: near maintenance.
    Recomp,
    /// Build muscle with a small surplus.
    LeanBulk,
    /// Get stronger on the main lifts.
    Strength,
    /// Hold weight, keep training.
    Maintain,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Pace {
    Gentle,
    Standard,
    Aggressive,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Experience {
    Beginner,
    Intermediate,
    Advanced,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Equipment {
    /// Barbells, machines, cables.
    Gym,
    /// Adjustable dumbbells and a bench.
    Dumbbell,
    /// Bodyweight, bands, a pull-up bar.
    Home,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Lifestyle {
    Desk,
    OnFeet,
    Manual,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Limit {
    Knee,
    LowerBack,
    Shoulder,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[serde(rename_all = "snake_case")]
pub enum Muscle {
    Chest,
    Back,
    Shoulders,
    RearDelts,
    Biceps,
    Triceps,
    Quads,
    Hamstrings,
    Glutes,
    Calves,
    Abs,
}

impl Muscle {
    pub const ALL: [Muscle; 11] = [
        Muscle::Chest,
        Muscle::Back,
        Muscle::Shoulders,
        Muscle::RearDelts,
        Muscle::Biceps,
        Muscle::Triceps,
        Muscle::Quads,
        Muscle::Hamstrings,
        Muscle::Glutes,
        Muscle::Calves,
        Muscle::Abs,
    ];

    pub fn label(self) -> &'static str {
        match self {
            Muscle::Chest => "Chest",
            Muscle::Back => "Back",
            Muscle::Shoulders => "Shoulders",
            Muscle::RearDelts => "Rear delts",
            Muscle::Biceps => "Biceps",
            Muscle::Triceps => "Triceps",
            Muscle::Quads => "Quads",
            Muscle::Hamstrings => "Hamstrings",
            Muscle::Glutes => "Glutes",
            Muscle::Calves => "Calves",
            Muscle::Abs => "Abs",
        }
    }
}

/// Body-part focus as the user picks it; "arms" and "shoulders" cover two muscles.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Focus {
    Chest,
    Back,
    Shoulders,
    Arms,
    Quads,
    Hamstrings,
    Glutes,
    Calves,
    Abs,
}

impl Focus {
    pub fn muscles(self) -> &'static [Muscle] {
        match self {
            Focus::Chest => &[Muscle::Chest],
            Focus::Back => &[Muscle::Back],
            Focus::Shoulders => &[Muscle::Shoulders, Muscle::RearDelts],
            Focus::Arms => &[Muscle::Biceps, Muscle::Triceps],
            Focus::Quads => &[Muscle::Quads],
            Focus::Hamstrings => &[Muscle::Hamstrings],
            Focus::Glutes => &[Muscle::Glutes],
            Focus::Calves => &[Muscle::Calves],
            Focus::Abs => &[Muscle::Abs],
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Profile {
    pub sex: Sex,
    pub birth_year: i32,
    pub height_cm: f64,
    pub weight_kg: f64,
    #[serde(default)]
    pub body_fat: Option<f64>,
    pub goal: Goal,
    pub pace: Pace,
    #[serde(default)]
    pub goal_weight_kg: Option<f64>,
    pub experience: Experience,
    pub days: u8,
    pub session_min: u16,
    pub equipment: Equipment,
    #[serde(default)]
    pub focus: Vec<Focus>,
    #[serde(default)]
    pub limits: Vec<Limit>,
    pub lifestyle: Lifestyle,
}

impl Profile {
    /// Clamp everything to the ranges the planner is designed for.
    pub fn normalized(&self, year: i32) -> Profile {
        let mut p = self.clone();
        p.days = p.days.clamp(2, 6);
        p.session_min = p.session_min.clamp(30, 120);
        p.height_cm = p.height_cm.clamp(130.0, 230.0);
        p.weight_kg = p.weight_kg.clamp(35.0, 250.0);
        p.birth_year = p.birth_year.clamp(year - 90, year - 14);
        p.body_fat = p.body_fat.filter(|bf| (3.0..=60.0).contains(bf));
        p.focus.sort();
        p.focus.dedup();
        p.focus.truncate(2);
        p.limits.sort();
        p.limits.dedup();
        p
    }

    pub fn age(&self, year: i32) -> i32 {
        year - self.birth_year
    }
}

/// One line of reasoning shown next to the plan.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Note {
    pub topic: String,
    pub text: String,
}

fn note(topic: &str, text: impl Into<String>) -> Note {
    Note { topic: topic.into(), text: text.into() }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Plan {
    pub version: u32,
    /// Calendar year the plan was made in (for age).
    pub year: i32,
    pub profile: Profile,
    pub nutrition: nutrition::Nutrition,
    pub training: program::Training,
    pub notes: Vec<Note>,
}

pub const PLAN_VERSION: u32 = 1;

/// The whole planner: a pure function of the profile and the year.
pub fn generate(profile: &Profile, year: i32) -> Plan {
    let p = profile.normalized(year);
    let mut notes = Vec::new();
    let nutrition = nutrition::plan(&p, year, &mut notes);
    let training = program::plan(&p, &mut notes);
    Plan { version: PLAN_VERSION, year, profile: p, nutrition, training, notes }
}

// ———————————————————————————————————————————————————————————— calendar

/// Days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's algorithm).
pub fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// "YYYY-MM-DD" to a day number.
pub fn day_number(day: &str) -> Option<i64> {
    let mut it = day.split('-').map(|s| s.parse::<i64>());
    let (y, m, d) = (it.next()?.ok()?, it.next()?.ok()?, it.next()?.ok()?);
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    Some(days_from_civil(y, m, d))
}

pub fn civil_from_days(z: i64) -> String {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}")
}

/// Monday = 0 … Sunday = 6.
pub fn weekday(day: &str) -> Option<usize> {
    // 1970-01-01 was a Thursday (index 3).
    day_number(day).map(|n| ((n + 3).rem_euclid(7)) as usize)
}

#[cfg(test)]
pub(crate) fn sample_profile() -> Profile {
    Profile {
        sex: Sex::Male,
        birth_year: 1996,
        height_cm: 178.0,
        weight_kg: 80.0,
        body_fat: None,
        goal: Goal::LeanBulk,
        pace: Pace::Standard,
        goal_weight_kg: None,
        experience: Experience::Intermediate,
        days: 4,
        session_min: 75,
        equipment: Equipment::Gym,
        focus: vec![Focus::Arms],
        limits: vec![],
        lifestyle: Lifestyle::Desk,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calendar_round_trips() {
        assert_eq!(weekday("2026-11-02"), Some(0)); // a Monday
        assert_eq!(weekday("2026-11-01"), Some(6)); // a Sunday
        for s in ["1999-12-31", "2000-02-29", "2026-03-01", "2030-07-15"] {
            assert_eq!(civil_from_days(day_number(s).unwrap()), s);
        }
    }

    /// `cargo test print_sample -- --ignored --nocapture` to eyeball a plan.
    #[test]
    #[ignore]
    fn print_sample() {
        let plan = generate(&sample_profile(), 2026);
        let n = &plan.nutrition;
        println!("kcal {} (train {} / rest {}) P{} C{} F{} tdee {} rate {}", n.kcal, n.training_day_kcal, n.rest_day_kcal, n.protein, n.carbs, n.fat, n.tdee, n.rate_kg_week);
        for s in &plan.training.sessions {
            println!("\n{} · {} min", s.name, s.minutes);
            for e in &s.exercises {
                println!("  {:<32} {}×{}-{} RIR{} rest {}s", e.name, e.sets, e.rep_low, e.rep_high, e.rir, e.rest_s);
            }
        }
        for v in &plan.training.volume {
            print!("{:?} {}/{}  ", v.muscle, v.sets, v.target);
        }
        println!();
        for nt in &plan.notes {
            println!("[{}] {}", nt.topic, nt.text);
        }
    }

    #[test]
    fn dump_sample_json() {
        // Writes the sample plan the browser mock serves (`src/dev/sample-plan.json`).
        if std::env::var("TALLY_DUMP").is_ok() {
            let json = serde_json::to_string_pretty(&generate(&sample_profile(), 2026)).unwrap();
            std::fs::write("../src/dev/sample-plan.json", json).unwrap();
        }
    }

    #[test]
    fn same_answers_same_plan() {
        let p = sample_profile();
        let a = serde_json::to_string(&generate(&p, 2026)).unwrap();
        let b = serde_json::to_string(&generate(&p, 2026)).unwrap();
        assert_eq!(a, b);
    }
}
