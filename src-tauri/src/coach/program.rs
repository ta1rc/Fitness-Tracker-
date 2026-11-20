//! The training program: split, exercises, sets, reps, effort, and how the
//! block progresses.

use super::library::{candidates, Pattern};
use super::{note, Equipment, Experience, Goal, Limit, Muscle, Note, Profile};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Prescription {
    pub exercise_id: String,
    pub name: String,
    pub pattern: Pattern,
    pub muscle: Muscle,
    /// 1 = main lift, 2 = secondary compound, 3 = isolation.
    pub tier: u8,
    pub sets: u8,
    pub rep_low: u8,
    pub rep_high: u8,
    /// Reps in reserve to stop at in the first week of the block.
    pub rir: u8,
    pub rest_s: u16,
    pub step_kg: f64,
    pub note: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Session {
    pub key: String,
    pub name: String,
    pub focus: String,
    pub minutes: u16,
    pub exercises: Vec<Prescription>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Week {
    pub n: u8,
    pub label: String,
    pub rir: u8,
    /// Sets relative to week one, %.
    pub volume_pct: u16,
    pub deload: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct MuscleVolume {
    pub muscle: Muscle,
    pub sets: u32,
    pub target: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Training {
    pub split: String,
    pub days_per_week: u8,
    /// Monday..Sunday → index into `sessions`, or rest.
    pub schedule: Vec<Option<usize>>,
    pub sessions: Vec<Session>,
    pub volume: Vec<MuscleVolume>,
    pub block: Vec<Week>,
    pub progression: Vec<String>,
    pub warmup: String,
}

type Slot = (Pattern, u8);

use Pattern::*;
const FB_A: &[Slot] = &[(Squat, 1), (HorizontalPress, 1), (HorizontalPull, 2), (Hinge, 2), (LateralRaise, 3), (Curl, 3)];
const FB_B: &[Slot] = &[(Hinge, 1), (VerticalPress, 1), (VerticalPull, 2), (Lunge, 2), (TricepsExtension, 3), (Calf, 3)];
const FB_C: &[Slot] = &[(Squat, 1), (InclinePress, 2), (HorizontalPull, 2), (KneeFlexion, 3), (RearDelt, 3), (Core, 3)];
const UPPER_A: &[Slot] = &[(HorizontalPress, 1), (HorizontalPull, 1), (VerticalPress, 2), (VerticalPull, 2), (LateralRaise, 3), (Curl, 3), (TricepsExtension, 3)];
const UPPER_B: &[Slot] = &[(InclinePress, 1), (VerticalPull, 1), (HorizontalPull, 2), (LateralRaise, 3), (RearDelt, 3), (TricepsExtension, 3), (Curl, 3)];
const LOWER_A: &[Slot] = &[(Squat, 1), (Hinge, 2), (KneeExtension, 3), (KneeFlexion, 3), (HipThrust, 3), (Calf, 3), (Core, 3)];
const LOWER_B: &[Slot] = &[(Hinge, 1), (Lunge, 2), (HipThrust, 2), (KneeFlexion, 3), (Calf, 3), (Core, 3)];
const PUSH: &[Slot] = &[(HorizontalPress, 1), (InclinePress, 2), (VerticalPress, 2), (LateralRaise, 3), (ChestFly, 3), (TricepsExtension, 3)];
const PULL: &[Slot] = &[(VerticalPull, 1), (HorizontalPull, 1), (RearDelt, 3), (Curl, 3), (Curl, 3)];
const LEGS: &[Slot] = &[(Squat, 1), (Hinge, 2), (Lunge, 2), (KneeFlexion, 3), (Calf, 3), (Core, 3)];

struct Template {
    key: &'static str,
    name: &'static str,
    focus: &'static str,
    variant: usize,
    slots: &'static [Slot],
}

const fn t(key: &'static str, name: &'static str, focus: &'static str, variant: usize, slots: &'static [Slot]) -> Template {
    Template { key, name, focus, variant, slots }
}

fn split(days: u8) -> (&'static str, Vec<Template>, [usize; 7], &'static str) {
    // Schedule: which weekdays (Mon = 0) carry sessions 0..n. Rest days are spread out.
    match days {
        2 => (
            "Full body ×2",
            vec![t("full_a", "Full body A", "Squat · press · row", 0, FB_A), t("full_b", "Full body B", "Hinge · overhead · pull", 0, FB_B)],
            [0, 9, 9, 1, 9, 9, 9],
            "Two full-body days hit every muscle twice a week, the minimum frequency that reliably drives growth.",
        ),
        3 => (
            "Full body ×3",
            vec![
                t("full_a", "Full body A", "Squat · press · row", 0, FB_A),
                t("full_b", "Full body B", "Hinge · overhead · pull", 0, FB_B),
                t("full_c", "Full body C", "Squat · incline · accessories", 1, FB_C),
            ],
            [0, 9, 1, 9, 2, 9, 9],
            "Three full-body days, each with a different main lift. Lots of practice on the big movements and a rest day between sessions.",
        ),
        4 => (
            "Upper / lower",
            vec![
                t("upper_a", "Upper A", "Horizontal press & pull", 0, UPPER_A),
                t("lower_a", "Lower A", "Squat-led", 0, LOWER_A),
                t("upper_b", "Upper B", "Incline & vertical pull", 1, UPPER_B),
                t("lower_b", "Lower B", "Hinge-led", 1, LOWER_B),
            ],
            [0, 1, 9, 2, 3, 9, 9],
            "Upper/lower over four days trains each muscle twice a week with enough recovery between sessions.",
        ),
        5 => (
            "Upper / lower + push / pull / legs",
            vec![
                t("upper_a", "Upper", "Strength-leaning upper", 0, UPPER_A),
                t("lower_a", "Lower", "Strength-leaning lower", 0, LOWER_A),
                t("push", "Push", "Chest, shoulders, triceps", 1, PUSH),
                t("pull", "Pull", "Back, rear delts, biceps", 1, PULL),
                t("legs", "Legs", "Quads, hamstrings, glutes", 1, LEGS),
            ],
            [0, 1, 2, 9, 3, 4, 9],
            "A heavier upper/lower pair early in the week, then a higher-volume push/pull/legs run. Every muscle gets hit twice.",
        ),
        _ => (
            "Push / pull / legs ×2",
            vec![
                t("push_a", "Push A", "Chest-led", 0, PUSH),
                t("pull_a", "Pull A", "Lats-led", 0, PULL),
                t("legs_a", "Legs A", "Squat-led", 0, LEGS),
                t("push_b", "Push B", "Shoulder-led", 1, PUSH),
                t("pull_b", "Pull B", "Upper back-led", 1, PULL),
                t("legs_b", "Legs B", "Hinge-led", 1, LEGS),
            ],
            [0, 1, 2, 3, 4, 5, 9],
            "Push/pull/legs twice through: high frequency and volume for someone who recovers well. Sunday is off.",
        ),
    }
}

fn is_upper(m: Muscle) -> bool {
    matches!(m, Muscle::Chest | Muscle::Back | Muscle::Shoulders | Muscle::RearDelts | Muscle::Biceps | Muscle::Triceps)
}

/// Weekly direct sets to aim for, per muscle.
fn weekly_target(m: Muscle, p: &Profile) -> u32 {
    let base: f64 = match p.experience {
        Experience::Beginner => 10.0,
        Experience::Intermediate => 14.0,
        Experience::Advanced => 18.0,
    };
    // Muscles that get a lot of indirect work from compounds need less direct volume.
    let share = match m {
        Muscle::Chest | Muscle::Back | Muscle::Quads => 1.0,
        Muscle::Hamstrings | Muscle::Shoulders => 0.8,
        Muscle::Biceps | Muscle::Triceps => 0.7,
        Muscle::Glutes | Muscle::RearDelts | Muscle::Calves | Muscle::Abs => 0.6,
    };
    let goal = match p.goal {
        Goal::Cut | Goal::Strength => 0.85,
        Goal::Maintain => 0.7,
        Goal::Recomp | Goal::LeanBulk => 1.0,
    };
    let focus_bonus = if p.focus.iter().any(|f| f.muscles().contains(&m)) {
        if p.experience == Experience::Beginner { 2.0 } else { 4.0 }
    } else {
        0.0
    };
    (base * share * goal + focus_bonus).round() as u32
}

/// Rep range, rest (s) and reps in reserve for a slot.
fn dose(p: &Profile, tier: u8, bodyweight: bool) -> (u8, u8, u16, u8) {
    let (mut lo, mut hi, rest, rir) = match (p.goal == Goal::Strength, tier) {
        (true, 1) => (3, 5, 180, 2),
        (true, 2) => (6, 8, 150, 2),
        (true, _) => (10, 15, 75, 1),
        (false, 1) if p.experience == Experience::Beginner => (6, 10, 150, 2),
        (false, 1) => (5, 8, 150, 2),
        (false, 2) => (8, 12, 120, 2),
        (false, _) => (12, 20, 75, 1),
    };
    if bodyweight {
        lo = lo.max(8);
        hi = hi.max(if tier == 3 { 25 } else { 15 });
    }
    (lo, hi, rest, rir)
}

fn minutes(ex: &[Prescription]) -> u16 {
    let ramp = ex.iter().filter(|e| e.tier == 1).count() as u32 * 3;
    let work: u32 = ex.iter().map(|e| e.sets as u32 * (45 + e.rest_s as u32)).sum();
    (6 + ramp + (work + 59) / 60) as u16
}

pub fn plan(p: &Profile, notes: &mut Vec<Note>) -> Training {
    let (split_name, templates, schedule_map, why) = split(p.days);
    notes.push(note("Split", why));

    let focus_muscles: Vec<Muscle> = p.focus.iter().flat_map(|f| f.muscles().iter().copied()).collect();

    // ——— 1. Slots per session, with focus isolation added where it fits.
    let mut slots: Vec<Vec<Slot>> = templates.iter().map(|t| t.slots.to_vec()).collect();
    // Up to two added exercises per focus area (one on 2–3 day plans), shared
    // between its muscles: "arms" gets one curl and one extension, not four.
    let mut extras: Vec<(Muscle, usize)> = Vec::new();
    for f in &p.focus {
        let per_area = if p.days >= 4 { 2 } else { 1 };
        let ms = f.muscles();
        for &m in ms {
            extras.push((m, (per_area / ms.len()).max(1)));
        }
    }
    for &(m, extra_per_muscle) in &extras {
        let pat = Pattern::isolating(m);
        let mut chosen: Vec<usize> = Vec::new();
        while chosen.len() < extra_per_muscle {
            // Sessions that already train this half of the body, fewest exercises first.
            // If the session already has this pattern, the second pick is a different variation.
            let pick = (0..slots.len())
                .filter(|i| !chosen.contains(i))
                .filter(|&i| {
                    let s = &slots[i];
                    let full = s.iter().any(|(pt, _)| is_upper(pt.muscle())) && s.iter().any(|(pt, _)| !is_upper(pt.muscle()));
                    full || m == Muscle::Abs || s.iter().any(|(pt, _)| is_upper(pt.muscle()) == is_upper(m))
                })
                .min_by_key(|&i| (slots[i].len(), i));
            match pick {
                Some(i) => {
                    slots[i].push((pat, 3));
                    chosen.push(i);
                }
                None => break,
            }
        }
    }

    // ——— 2. Choose exercises.
    let mut sessions: Vec<Session> = Vec::new();
    let mut relaxed_any = false;
    for (ti, tpl) in templates.iter().enumerate() {
        let mut used: Vec<&str> = Vec::new();
        let mut ex = Vec::new();
        for &(pat, tier) in &slots[ti] {
            let prefer_main = p.goal == Goal::Strength && tier == 1 && p.equipment == Equipment::Gym;
            let (cands, relaxed) = candidates(pat, p.equipment, &p.limits, prefer_main);
            let start = if prefer_main { 0 } else { tpl.variant % cands.len() };
            let Some(e) = (0..cands.len()).map(|i| cands[(start + i) % cands.len()]).find(|e| !used.contains(&e.id)) else {
                continue;
            };
            used.push(e.id);
            relaxed_any |= relaxed;
            let bodyweight = e.step_kg == 0.0;
            let (lo, hi, rest, rir) = dose(p, tier, bodyweight);
            ex.push(Prescription {
                exercise_id: e.id.into(),
                name: e.name.into(),
                pattern: pat,
                muscle: pat.muscle(),
                tier,
                sets: 0,
                rep_low: lo,
                rep_high: hi,
                rir,
                rest_s: rest,
                step_kg: e.step_kg,
                note: if relaxed {
                    Some("Work only in a pain-free range.".into())
                } else if bodyweight && tier < 3 {
                    Some("When the top of the range is easy, slow the lowering to 3 s, then add load.".into())
                } else {
                    None
                },
            });
        }
        sessions.push(Session { key: tpl.key.into(), name: tpl.name.into(), focus: tpl.focus.into(), minutes: 0, exercises: ex });
    }

    // ——— 3. Sets: spread each muscle's weekly target across the slots that train it.
    let mut slot_count = [0u32; 11];
    for s in &sessions {
        for e in &s.exercises {
            slot_count[e.muscle as usize] += 1;
        }
    }
    for s in &mut sessions {
        for e in &mut s.exercises {
            let target = weekly_target(e.muscle, p) as f64;
            let per = target / slot_count[e.muscle as usize].max(1) as f64;
            let (min, max) = if e.tier == 1 { (3.0, 4.0) } else { (2.0, 4.0) };
            e.sets = per.round().clamp(min, max) as u8;
        }
    }

    // ——— 4. Fit the session length. Take sets from whichever muscle is furthest
    // over its weekly target, protecting main lifts and focus muscles.
    let targets: Vec<u32> = Muscle::ALL.iter().map(|&m| weekly_target(m, p)).collect();
    let mut weekly = [0u32; 11];
    for s in &sessions {
        for e in &s.exercises {
            weekly[e.muscle as usize] += e.sets as u32;
        }
    }
    let focus = |e: &Prescription| focus_muscles.contains(&e.muscle);
    for s in &mut sessions {
        while minutes(&s.exercises) > p.session_min {
            let score = |e: &Prescription| {
                let ratio = weekly[e.muscle as usize] as f64 / targets[e.muscle as usize].max(1) as f64;
                ratio - if focus(e) { 0.25 } else { 0.0 } - if e.tier == 1 { 0.35 } else { 0.0 }
            };
            let pick = (0..s.exercises.len())
                .filter(|&i| s.exercises[i].sets > if s.exercises[i].tier == 1 { 3 } else { 2 })
                .max_by(|&a, &b| {
                    let (ea, eb) = (&s.exercises[a], &s.exercises[b]);
                    score(ea).total_cmp(&score(eb)).then(ea.sets.cmp(&eb.sets)).then(a.cmp(&b))
                });
            if let Some(i) = pick {
                s.exercises[i].sets -= 1;
                weekly[s.exercises[i].muscle as usize] -= 1;
                continue;
            }
            // Still too long: drop the last isolation exercise, non-focus first.
            let drop = (0..s.exercises.len())
                .rev()
                .find(|&i| s.exercises[i].tier == 3 && !focus(&s.exercises[i]))
                .or_else(|| (0..s.exercises.len()).rev().find(|&i| s.exercises[i].tier == 3));
            match drop {
                Some(i) => {
                    let e = s.exercises.remove(i);
                    weekly[e.muscle as usize] -= e.sets as u32;
                }
                None => break,
            }
        }
        s.minutes = minutes(&s.exercises);
    }

    // ——— 5. Report weekly volume.
    let mut volume: Vec<MuscleVolume> = Muscle::ALL
        .iter()
        .map(|&m| MuscleVolume { muscle: m, sets: 0, target: weekly_target(m, p) })
        .collect();
    for s in &sessions {
        for e in &s.exercises {
            volume[e.muscle as usize].sets += e.sets as u32;
        }
    }

    let schedule: Vec<Option<usize>> = schedule_map.iter().map(|&i| if i < sessions.len() { Some(i) } else { None }).collect();

    // ——— 6. The block.
    let block: Vec<Week> = match p.experience {
        Experience::Beginner => (1..=6)
            .map(|n| Week { n, label: "Build".into(), rir: 2, volume_pct: 100, deload: false })
            .chain(std::iter::once(Week { n: 7, label: "Deload".into(), rir: 4, volume_pct: 60, deload: true }))
            .collect(),
        Experience::Intermediate => vec![
            Week { n: 1, label: "Settle in".into(), rir: 3, volume_pct: 100, deload: false },
            Week { n: 2, label: "Build".into(), rir: 2, volume_pct: 100, deload: false },
            Week { n: 3, label: "Push".into(), rir: 1, volume_pct: 110, deload: false },
            Week { n: 4, label: "Overreach".into(), rir: 1, volume_pct: 110, deload: false },
            Week { n: 5, label: "Deload".into(), rir: 4, volume_pct: 60, deload: true },
        ],
        Experience::Advanced => vec![
            Week { n: 1, label: "Settle in".into(), rir: 3, volume_pct: 100, deload: false },
            Week { n: 2, label: "Build".into(), rir: 2, volume_pct: 105, deload: false },
            Week { n: 3, label: "Build".into(), rir: 2, volume_pct: 110, deload: false },
            Week { n: 4, label: "Push".into(), rir: 1, volume_pct: 115, deload: false },
            Week { n: 5, label: "Overreach".into(), rir: 0, volume_pct: 120, deload: false },
            Week { n: 6, label: "Deload".into(), rir: 4, volume_pct: 50, deload: true },
        ],
    };

    let mut progression = match p.experience {
        Experience::Beginner => vec![
            "Linear progression: when every set reaches the top of the rep range, add the smallest jump next session: 2.5 kg on upper-body lifts, 5 kg on lower-body lifts.".to_string(),
            "If you miss the bottom of the range two sessions in a row, drop the load 10% and build back up.".into(),
        ],
        Experience::Intermediate => vec![
            "Double progression: add reps within the range first. Once every set hits the top, add load and start again at the bottom.".to_string(),
            "Follow the block: week by week, finish each set with fewer reps in reserve, then deload in week 5 with fewer sets and lighter efforts.".into(),
        ],
        Experience::Advanced => vec![
            "Double progression on accessories. On main lifts, keep load steady through the block and let the reps-in-reserve target drop each week.".to_string(),
            "Add a set to lagging muscles in weeks 3–5 if you recover well. Deload in week 6, then start the next block a little heavier.".into(),
        ],
    };
    if p.goal == Goal::Cut {
        progression.push("In a deficit, holding your loads is a win. Keep the weight on the bar, and if you need to cut anything, cut sets before load.".into());
    }

    if !p.limits.is_empty() {
        let names: Vec<&str> = p
            .limits
            .iter()
            .map(|l| match l {
                Limit::Knee => "knees",
                Limit::LowerBack => "lower back",
                Limit::Shoulder => "shoulders",
            })
            .collect();
        notes.push(note(
            "Joints",
            format!(
                "Exercises that load your {} hard were swapped for friendlier variations{}.",
                names.join(" and "),
                if relaxed_any { "; where nothing safer exists for your kit, the plan says to work only in a pain-free range" } else { "" }
            ),
        ));
    }
    if !focus_muscles.is_empty() {
        let names: Vec<&str> = focus_muscles.iter().map(|m| m.label()).collect();
        notes.push(note("Focus", format!("{} get extra direct sets and an added isolation exercise.", names.join(", "))));
    }
    let short: Vec<&str> = volume.iter().filter(|v| (v.sets as f64) < v.target as f64 * 0.75).map(|v| v.muscle.label()).collect();
    if !short.is_empty() {
        notes.push(note(
            "Volume",
            format!(
                "To fit {}-minute sessions, {} sit below the ideal weekly sets. Longer sessions or one more day would close the gap.",
                p.session_min,
                short.join(", ").to_lowercase()
            ),
        ));
    }
    let longest = sessions.iter().map(|s| s.minutes).max().unwrap_or(0);
    notes.push(note(
        "Volume",
        format!(
            "Sets are sized for a{} lifter and fit your {}-minute sessions. The longest runs about {} min, including warm-up.",
            match p.experience {
                Experience::Beginner => " newer",
                Experience::Intermediate => "n intermediate",
                Experience::Advanced => "n advanced",
            },
            p.session_min,
            longest
        ),
    ));

    Training {
        split: split_name.into(),
        days_per_week: p.days,
        schedule,
        sessions,
        volume,
        block,
        progression,
        warmup: "5 minutes of easy cardio, then 2–3 ramp-up sets before the first exercise: 50% × 8, 70% × 5, 85% × 2.".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::coach::{generate, sample_profile, Focus};

    #[test]
    fn day_count_matches_schedule() {
        for days in 2..=6u8 {
            let mut p = sample_profile();
            p.days = days;
            let plan = generate(&p, 2026);
            let t = &plan.training;
            assert_eq!(t.sessions.len(), days as usize);
            assert_eq!(t.schedule.iter().filter(|d| d.is_some()).count(), days as usize);
            for s in &t.sessions {
                assert!(s.exercises.len() >= 4, "{} has {}", s.name, s.exercises.len());
                assert!(s.exercises.iter().all(|e| e.sets >= 2 && e.rep_low < e.rep_high));
            }
        }
    }

    #[test]
    fn sessions_fit_the_time() {
        for min in [45u16, 60, 75, 90] {
            for days in 2..=6u8 {
                let mut p = sample_profile();
                p.session_min = min;
                p.days = days;
                for s in &generate(&p, 2026).training.sessions {
                    assert!(s.minutes <= min + 5, "{} at {min}: {}", s.name, s.minutes);
                }
            }
        }
    }

    #[test]
    fn home_kit_only_bodyweight() {
        let mut p = sample_profile();
        p.equipment = Equipment::Home;
        for s in &generate(&p, 2026).training.sessions {
            assert!(s.exercises.iter().all(|e| e.step_kg == 0.0), "{}", s.name);
        }
    }

    #[test]
    fn strength_goal_uses_the_main_lifts() {
        let mut p = sample_profile();
        p.goal = Goal::Strength;
        let plan = generate(&p, 2026);
        let ids: Vec<String> = plan.training.sessions.iter().flat_map(|s| s.exercises.iter().map(|e| e.exercise_id.clone())).collect();
        for lift in ["back_squat", "bench", "deadlift"] {
            assert!(ids.iter().any(|i| i == lift), "missing {lift}");
        }
    }

    #[test]
    fn focus_adds_volume() {
        let mut p = sample_profile();
        p.focus = vec![];
        let base = generate(&p, 2026);
        p.focus = vec![Focus::Glutes];
        let focused = generate(&p, 2026);
        let g = |pl: &crate::coach::Plan| pl.training.volume[Muscle::Glutes as usize].sets;
        assert!(g(&focused) > g(&base));
    }

    #[test]
    fn no_exercise_twice_in_a_session() {
        for days in 2..=6u8 {
            let mut p = sample_profile();
            p.days = days;
            p.equipment = Equipment::Dumbbell;
            for s in &generate(&p, 2026).training.sessions {
                let mut ids: Vec<&str> = s.exercises.iter().map(|e| e.exercise_id.as_str()).collect();
                let n = ids.len();
                ids.sort();
                ids.dedup();
                assert_eq!(n, ids.len(), "{}", s.name);
            }
        }
    }
}
