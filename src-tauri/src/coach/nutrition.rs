//! Energy and macro targets.

use super::{note, Experience, Goal, Lifestyle, Note, Pace, Profile, Sex};
use serde::{Deserialize, Serialize};

/// Energy in one kilogram of body-mass change, kcal. A planning constant.
pub const KCAL_PER_KG: f64 = 7700.0;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Nutrition {
    pub method: String,
    pub bmi: f64,
    pub lean_mass_kg: Option<f64>,
    pub bmr: f64,
    pub activity_factor: f64,
    /// Average net cost of the planned training, per day.
    pub training_kcal: f64,
    pub tdee: f64,
    /// Target change in body weight, kg per week (negative = loss).
    pub rate_kg_week: f64,
    pub kcal: f64,
    pub training_day_kcal: f64,
    pub rest_day_kcal: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fat: f64,
    pub fiber: f64,
    pub water_ml: f64,
    pub steps: i64,
    /// Planned length of this phase.
    pub phase_weeks: u32,
    /// Weeks to the goal weight at the planned rate, when there is one.
    pub weeks_to_goal: Option<u32>,
}

fn r(v: f64, to: f64) -> f64 {
    (v / to).round() * to
}

/// Monthly gain for a lean bulk, as % of body weight. Newer lifters can add
/// muscle faster, so a larger surplus is less likely to go to fat.
fn monthly_gain_pct(e: Experience) -> f64 {
    match e {
        Experience::Beginner => 1.5,
        Experience::Intermediate => 1.0,
        Experience::Advanced => 0.5,
    }
}

pub fn plan(p: &Profile, year: i32, notes: &mut Vec<Note>) -> Nutrition {
    let w = p.weight_kg;
    let h_m = p.height_cm / 100.0;
    let bmi = w / (h_m * h_m);
    let age = p.age(year) as f64;
    let lean = p.body_fat.map(|bf| w * (1.0 - bf / 100.0));

    // ——— Resting and total expenditure
    let (bmr, method) = match lean {
        Some(l) => (370.0 + 21.6 * l, "Katch–McArdle"),
        None => {
            let base = 10.0 * w + 6.25 * p.height_cm - 5.0 * age;
            (if p.sex == Sex::Male { base + 5.0 } else { base - 161.0 }, "Mifflin–St Jeor")
        }
    };
    let activity_factor = match p.lifestyle {
        Lifestyle::Desk => 1.25,
        Lifestyle::OnFeet => 1.4,
        Lifestyle::Manual => 1.55,
    };
    // Net cost of resistance training ≈ 0.07 kcal per kg per minute.
    let training_kcal = p.days as f64 * p.session_min as f64 * 0.07 * w / 7.0;
    let tdee = bmr * activity_factor + training_kcal;
    notes.push(note(
        "Energy",
        format!(
            "Resting burn {:.0} kcal ({method}{}), × {activity_factor} for daily movement, plus ~{:.0} kcal a day for {} sessions of {} min: maintenance is about {:.0} kcal.",
            bmr,
            if lean.is_some() { ", from your lean mass" } else { "" },
            training_kcal,
            p.days,
            p.session_min,
            tdee
        ),
    ));

    // ——— Rate of change
    let pace_mult = match p.pace {
        Pace::Gentle => 0.75,
        Pace::Standard => 1.0,
        Pace::Aggressive => 1.25,
    };
    let lean_already = p.body_fat.is_some_and(|bf| if p.sex == Sex::Male { bf < 12.0 } else { bf < 20.0 });
    let pct_week = match p.goal {
        Goal::Cut => {
            let base: f64 = match p.pace {
                Pace::Gentle => 0.5,
                Pace::Standard => 0.75,
                Pace::Aggressive => 1.0,
            };
            let capped = if lean_already { base.min(0.5) } else { base };
            if capped < base {
                notes.push(note("Rate", "You're already lean, so the loss rate is capped at 0.5% of body weight a week to protect muscle."));
            }
            -capped
        }
        Goal::LeanBulk => monthly_gain_pct(p.experience) * pace_mult / 4.345,
        Goal::Strength => monthly_gain_pct(p.experience) * 0.5 * pace_mult / 4.345,
        Goal::Recomp | Goal::Maintain => 0.0,
    };
    let mut rate = pct_week / 100.0 * w;

    let mut kcal = match p.goal {
        // A small deficit with high protein: slow fat loss while training drives growth.
        Goal::Recomp => tdee * 0.92,
        _ => tdee + rate * KCAL_PER_KG / 7.0,
    };
    let floor = bmr.max(if p.sex == Sex::Male { 1500.0 } else { 1200.0 });
    if kcal < floor {
        kcal = floor;
        rate = (kcal - tdee) * 7.0 / KCAL_PER_KG;
        notes.push(note("Rate", format!("Calories are held at {floor:.0}, your floor, so the rate is slower: {rate:+.2} kg a week.")));
    }
    if p.goal == Goal::Recomp {
        rate = (kcal - tdee) * 7.0 / KCAL_PER_KG;
    }
    let kcal = r(kcal, 10.0);

    match p.goal {
        Goal::Cut => notes.push(note(
            "Rate",
            format!("Losing {:.1}% of body weight a week ({:.2} kg): a {:.0} kcal daily deficit.", -pct_week, -rate, tdee - kcal),
        )),
        Goal::LeanBulk | Goal::Strength => notes.push(note(
            "Rate",
            format!(
                "Gaining about {:.2} kg a week ({:.1}% a month) from a {:.0} kcal surplus, sized for a{} lifter so most of it is muscle.",
                rate,
                pct_week * 4.345,
                kcal - tdee,
                match p.experience {
                    Experience::Beginner => " newer",
                    Experience::Intermediate => "n intermediate",
                    Experience::Advanced => "n advanced",
                }
            ),
        )),
        Goal::Recomp => notes.push(note("Rate", "An 8% deficit with high protein: weight stays roughly flat while body composition shifts. Judge it by the mirror, measurements and strength, not the scale.")),
        Goal::Maintain => notes.push(note("Rate", "Calories match maintenance. Expect weight to move within about ±1 kg.")),
    }

    // ——— Macros
    let cutting = matches!(p.goal, Goal::Cut | Goal::Recomp);
    let protein = match lean {
        Some(l) => l * if cutting { 2.6 } else { 2.3 },
        None => {
            // Above BMI 27, scale protein to a reference weight instead of total weight.
            let ref_w = if bmi > 27.0 { 25.0 * h_m * h_m + (w - 25.0 * h_m * h_m) * 0.25 } else { w };
            ref_w * if cutting { 2.2 } else { 1.8 }
        }
    };
    let protein = r(protein, 5.0);
    let fat_share = if cutting { 0.22 } else { 0.27 };
    let mut fat = r((kcal * fat_share / 9.0).max(0.6 * w), 5.0);
    let mut carbs = (kcal - protein * 4.0 - fat * 9.0) / 4.0;
    if carbs < 50.0 {
        fat = r(((kcal - protein * 4.0 - 200.0) / 9.0).max(0.5 * w), 5.0);
        carbs = (kcal - protein * 4.0 - fat * 9.0) / 4.0;
    }
    let carbs = r(carbs.max(0.0), 5.0);
    notes.push(note(
        "Macros",
        format!(
            "Protein {protein:.0} g ({:.1} g/kg{}), the lever that protects and builds muscle. Fat {fat:.0} g for hormones. Carbs fill the rest ({carbs:.0} g) to fuel training.",
            protein / w,
            if lean.is_some() { " of body weight, set from lean mass" } else if bmi > 27.0 { ", scaled to a reference weight" } else { "" }
        ),
    ));

    // Carbs move toward training days; the weekly average stays the same.
    let shift = r(kcal * 0.08, 10.0);
    let n = p.days as f64;
    let training_day_kcal = r(kcal + shift * (7.0 - n) / 7.0, 10.0);
    let rest_day_kcal = r(kcal - shift * n / 7.0, 10.0);

    let fiber = r(kcal / 1000.0 * 14.0, 1.0);
    let water_ml = r(35.0 * w + 500.0 * n / 7.0, 250.0);
    let steps = match (p.goal, p.pace) {
        (Goal::Cut, Pace::Aggressive) => 12000,
        (Goal::Cut, _) => 10000,
        (Goal::Recomp, _) => 9000,
        _ => 8000,
    };

    // ——— Timeline
    let default_weeks = match p.goal {
        Goal::Cut => 12,
        Goal::LeanBulk => 20,
        Goal::Strength => 12,
        Goal::Recomp => 12,
        Goal::Maintain => 8,
    };
    let mut weeks_to_goal = None;
    if let Some(gw) = p.goal_weight_kg {
        let diff = gw - w;
        if rate.abs() > 0.01 && diff.signum() == rate.signum() {
            let weeks = (diff / rate).ceil() as u32;
            weeks_to_goal = Some(weeks.min(104));
            notes.push(note("Timeline", format!("At this rate, {gw:.1} kg is about {weeks} weeks away.")));
        } else if diff.abs() >= 0.5 {
            notes.push(note(
                "Timeline",
                format!("Your goal weight ({gw:.1} kg) points the other way from this phase. Finish this phase first, then set up the next one."),
            ));
        }
    }
    let phase_weeks = weeks_to_goal.map(|w| w.clamp(4, if p.goal == Goal::Cut { 16 } else { 26 })).unwrap_or(default_weeks);
    if p.goal == Goal::Cut && weeks_to_goal.is_some_and(|w| w > 16) {
        notes.push(note("Timeline", "That is a long cut. Run it in blocks of up to 16 weeks with 1–2 weeks at maintenance between them."));
    }

    Nutrition {
        method: method.into(),
        bmi: r(bmi, 0.1),
        lean_mass_kg: lean.map(|l| r(l, 0.1)),
        bmr: bmr.round(),
        activity_factor,
        training_kcal: training_kcal.round(),
        tdee: tdee.round(),
        rate_kg_week: r(rate, 0.01),
        kcal,
        training_day_kcal,
        rest_day_kcal,
        protein,
        carbs,
        fat,
        fiber,
        water_ml,
        steps,
        phase_weeks,
        weeks_to_goal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::coach::sample_profile;

    fn run(f: impl FnOnce(&mut Profile)) -> Nutrition {
        let mut p = sample_profile();
        f(&mut p);
        plan(&p.normalized(2026), 2026, &mut Vec::new())
    }

    #[test]
    fn macros_add_up_to_calories() {
        for goal in [Goal::Cut, Goal::Recomp, Goal::LeanBulk, Goal::Strength, Goal::Maintain] {
            let n = run(|p| p.goal = goal);
            let sum = n.protein * 4.0 + n.carbs * 4.0 + n.fat * 9.0;
            assert!((sum - n.kcal).abs() < 40.0, "{goal:?}: {sum} vs {}", n.kcal);
        }
    }

    #[test]
    fn cut_is_a_deficit_and_bulk_a_surplus() {
        let cut = run(|p| p.goal = Goal::Cut);
        let bulk = run(|p| p.goal = Goal::LeanBulk);
        assert!(cut.kcal < cut.tdee && cut.rate_kg_week < 0.0);
        assert!(bulk.kcal > bulk.tdee && bulk.rate_kg_week > 0.0);
        assert!(cut.protein > bulk.protein);
    }

    #[test]
    fn never_below_the_floor() {
        let n = run(|p| {
            p.sex = Sex::Female;
            p.weight_kg = 48.0;
            p.height_cm = 152.0;
            p.goal = Goal::Cut;
            p.pace = Pace::Aggressive;
            p.days = 2;
        });
        assert!(n.kcal >= 1200.0);
    }

    #[test]
    fn goal_weight_sets_the_timeline() {
        let n = run(|p| {
            p.goal = Goal::Cut;
            p.goal_weight_kg = Some(74.0);
        });
        let weeks = n.weeks_to_goal.unwrap();
        assert!((8..=14).contains(&weeks), "{weeks}");
    }

    #[test]
    fn training_and_rest_days_average_to_target() {
        let n = run(|_| {});
        let avg = (n.training_day_kcal * 4.0 + n.rest_day_kcal * 3.0) / 7.0;
        assert!((avg - n.kcal).abs() <= 10.0);
    }
}
