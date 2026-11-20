//! Weekly check-in: compare what the scale did with what the plan asked for,
//! and nudge calories. Pure function of logged data.

use super::nutrition::KCAL_PER_KG;
use super::{day_number, Goal, Plan};
use serde::Serialize;

#[derive(Serialize, Debug, PartialEq)]
pub struct Checkin {
    pub status: Status,
    pub weigh_ins: usize,
    pub window_days: i64,
    /// Smoothed trend weight now, kg.
    pub trend_kg: Option<f64>,
    /// Observed rate from the trend, kg per week.
    pub actual_rate: Option<f64>,
    pub target_rate: f64,
    pub intake_days: usize,
    pub avg_intake: Option<f64>,
    /// Maintenance implied by intake and weight change, when both are logged.
    pub observed_tdee: Option<f64>,
    pub current_kcal: f64,
    pub change_kcal: f64,
    pub new_kcal: f64,
    pub headline: String,
    pub detail: String,
}

#[derive(Serialize, Debug, PartialEq, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    NotEnoughData,
    OnTrack,
    TooFast,
    TooSlow,
}

const WINDOW: i64 = 21;
const MIN_WEIGH_INS: usize = 6;

/// `weights` and `intake` are (day, value) pairs in any order.
pub fn review(plan: &Plan, weights: &[(String, f64)], intake: &[(String, f64)], today: &str, current_kcal: f64) -> Checkin {
    let target = plan.nutrition.rate_kg_week;
    let now = day_number(today).unwrap_or(0);
    let mut series: Vec<(i64, f64)> = weights.iter().filter_map(|(d, w)| day_number(d).map(|n| (n, *w))).filter(|(n, _)| *n <= now).collect();
    series.sort_by_key(|p| p.0);

    // Exponentially weighted trend over the whole history, then a least-squares
    // slope over the last three weeks of it.
    let mut trend: Vec<(i64, f64)> = Vec::with_capacity(series.len());
    let mut t: Option<f64> = None;
    for &(n, w) in &series {
        let v = match t {
            None => w,
            Some(prev) => prev + 0.1 * (w - prev),
        };
        t = Some(v);
        trend.push((n, v));
    }
    let recent: Vec<(i64, f64)> = trend.iter().copied().filter(|(n, _)| *n > now - WINDOW).collect();
    let weigh_ins = recent.len();
    let trend_kg = trend.last().map(|p| (p.1 * 10.0).round() / 10.0);

    let logged: Vec<f64> = intake
        .iter()
        .filter_map(|(d, k)| day_number(d).map(|n| (n, *k)))
        .filter(|(n, k)| *n > now - 14 && *n <= now && *k >= 800.0)
        .map(|(_, k)| k)
        .collect();
    let intake_days = logged.len();
    let avg_intake = (intake_days > 0).then(|| (logged.iter().sum::<f64>() / intake_days as f64).round());

    let base = Checkin {
        status: Status::NotEnoughData,
        weigh_ins,
        window_days: WINDOW,
        trend_kg,
        actual_rate: None,
        target_rate: target,
        intake_days,
        avg_intake,
        observed_tdee: None,
        current_kcal,
        change_kcal: 0.0,
        new_kcal: current_kcal,
        headline: String::new(),
        detail: String::new(),
    };

    let span = recent.last().map(|l| l.0).unwrap_or(0) - recent.first().map(|f| f.0).unwrap_or(0);
    if weigh_ins < MIN_WEIGH_INS || span < 10 {
        return Checkin {
            headline: "Keep weighing in".into(),
            detail: format!(
                "The check-in needs at least {MIN_WEIGH_INS} weigh-ins spread over 10+ days in the last {WINDOW}. You have {weigh_ins}. Weigh in each morning after the bathroom, before eating."
            ),
            ..base
        };
    }

    let n = recent.len() as f64;
    let mx = recent.iter().map(|p| p.0 as f64).sum::<f64>() / n;
    let my = recent.iter().map(|p| p.1).sum::<f64>() / n;
    let (mut num, mut den) = (0.0, 0.0);
    for &(x, y) in &recent {
        num += (x as f64 - mx) * (y - my);
        den += (x as f64 - mx).powi(2);
    }
    let per_day = if den > 0.0 { num / den } else { 0.0 };
    let actual = per_day * 7.0;
    let observed_tdee = (intake_days >= 10).then(|| (avg_intake.unwrap_or(0.0) - per_day * KCAL_PER_KG).round());

    // Within 0.1 kg/week of target (or 25% of it, whichever is larger) is on track.
    let tolerance = (target.abs() * 0.25).max(0.1);
    let gap = target - actual; // positive → need more energy
    let (status, change) = if gap.abs() <= tolerance {
        (Status::OnTrack, 0.0)
    } else {
        let raw = gap * KCAL_PER_KG / 7.0;
        let step = (raw.clamp(-250.0, 250.0) / 50.0).round() * 50.0;
        let losing_goal = plan.profile.goal == Goal::Cut;
        let status = if (losing_goal && actual < target) || (!losing_goal && actual > target) { Status::TooFast } else { Status::TooSlow };
        (status, step)
    };
    let new_kcal = ((current_kcal + change) / 10.0).round() * 10.0;
    let fmt_rate = |r: f64| format!("{}{:.2} kg/week", if r >= 0.0 { "+" } else { "−" }, r.abs());

    let (headline, detail) = match status {
        Status::OnTrack => (
            "On track. Change nothing".to_string(),
            format!("Your trend is moving {} against a target of {}. Keep calories at {:.0}.", fmt_rate(actual), fmt_rate(target), current_kcal),
        ),
        _ => (
            format!("{} {:.0} kcal a day", if change > 0.0 { "Add" } else { "Remove" }, change.abs()),
            format!(
                "Your trend is moving {} against a target of {}. Going from {:.0} to {:.0} kcal should close most of the gap; check again in two weeks.{}",
                fmt_rate(actual),
                fmt_rate(target),
                current_kcal,
                new_kcal,
                if change.abs() >= 250.0 { " The change is capped at 250 kcal so adjustments stay gradual." } else { "" }
            ),
        ),
    };

    Checkin { status, actual_rate: Some((actual * 100.0).round() / 100.0), observed_tdee, change_kcal: change, new_kcal, headline, detail, ..base }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::coach::{civil_from_days, day_number, generate, sample_profile};

    fn series(start: &str, days: i64, kg0: f64, per_week: f64) -> Vec<(String, f64)> {
        let s = day_number(start).unwrap();
        (0..days).map(|i| (civil_from_days(s + i), kg0 + per_week * i as f64 / 7.0)).collect()
    }

    #[test]
    fn not_enough_data() {
        let plan = generate(&sample_profile(), 2026);
        let c = review(&plan, &series("2026-10-28", 3, 80.0, 0.0), &[], "2026-10-31", 2800.0);
        assert_eq!(c.status, Status::NotEnoughData);
        assert_eq!(c.new_kcal, 2800.0);
    }

    #[test]
    fn bulking_but_flat_adds_calories() {
        let plan = generate(&sample_profile(), 2026);
        // A long flat history so the smoothed trend is genuinely flat.
        let c = review(&plan, &series("2026-08-01", 92, 80.0, 0.0), &[], "2026-10-31", 2800.0);
        assert_eq!(c.status, Status::TooSlow);
        assert!(c.change_kcal > 0.0);
    }

    #[test]
    fn cutting_too_fast_adds_calories() {
        let mut p = sample_profile();
        p.goal = crate::coach::Goal::Cut;
        let plan = generate(&p, 2026);
        let c = review(&plan, &series("2026-08-01", 92, 90.0, -1.5), &[], "2026-10-31", 2000.0);
        assert_eq!(c.status, Status::TooFast);
        assert!(c.change_kcal > 0.0 && c.change_kcal <= 250.0);
    }
}
