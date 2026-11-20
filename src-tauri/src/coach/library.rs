//! The exercise library. Within a pattern, entries are in order of preference:
//! the planner takes the first one the user's equipment and joints allow.

use super::{Equipment, Limit, Muscle};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Pattern {
    Squat,
    Hinge,
    Lunge,
    KneeExtension,
    KneeFlexion,
    HipThrust,
    HorizontalPress,
    InclinePress,
    VerticalPress,
    HorizontalPull,
    VerticalPull,
    ChestFly,
    LateralRaise,
    RearDelt,
    Curl,
    TricepsExtension,
    Calf,
    Core,
}

impl Pattern {
    pub fn muscle(self) -> Muscle {
        use Pattern::*;
        match self {
            Squat | Lunge | KneeExtension => Muscle::Quads,
            Hinge | KneeFlexion => Muscle::Hamstrings,
            HipThrust => Muscle::Glutes,
            HorizontalPress | InclinePress | ChestFly => Muscle::Chest,
            VerticalPress | LateralRaise => Muscle::Shoulders,
            HorizontalPull | VerticalPull => Muscle::Back,
            RearDelt => Muscle::RearDelts,
            Curl => Muscle::Biceps,
            TricepsExtension => Muscle::Triceps,
            Calf => Muscle::Calves,
            Core => Muscle::Abs,
        }
    }

    /// The isolation pattern used to add volume for a focus muscle.
    pub fn isolating(m: Muscle) -> Pattern {
        match m {
            Muscle::Chest => Pattern::ChestFly,
            Muscle::Back => Pattern::HorizontalPull,
            Muscle::Shoulders => Pattern::LateralRaise,
            Muscle::RearDelts => Pattern::RearDelt,
            Muscle::Biceps => Pattern::Curl,
            Muscle::Triceps => Pattern::TricepsExtension,
            Muscle::Quads => Pattern::KneeExtension,
            Muscle::Hamstrings => Pattern::KneeFlexion,
            Muscle::Glutes => Pattern::HipThrust,
            Muscle::Calves => Pattern::Calf,
            Muscle::Abs => Pattern::Core,
        }
    }
}

/// Minimum kit an exercise needs.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Need {
    Gym,
    Dumbbell,
    Body,
}

impl Need {
    pub fn available(self, eq: Equipment) -> bool {
        match eq {
            Equipment::Gym => true,
            Equipment::Dumbbell => self != Need::Gym,
            Equipment::Home => self == Need::Body,
        }
    }
}

#[derive(Debug)]
pub struct Exercise {
    pub id: &'static str,
    pub name: &'static str,
    pub pattern: Pattern,
    pub need: Need,
    /// Joints this loads hard enough to swap out when the user flags them.
    pub stress: &'static [Limit],
    /// Smallest sensible load jump, kg (0 for bodyweight).
    pub step_kg: f64,
    /// A competition-style barbell lift, preferred first for strength goals.
    pub main: bool,
}

const fn ex(id: &'static str, name: &'static str, pattern: Pattern, need: Need, stress: &'static [Limit], step_kg: f64) -> Exercise {
    Exercise { id, name, pattern, need, stress, step_kg, main: false }
}

const fn main(id: &'static str, name: &'static str, pattern: Pattern, stress: &'static [Limit], step_kg: f64) -> Exercise {
    Exercise { id, name, pattern, need: Need::Gym, stress, step_kg, main: true }
}

use Limit::{Knee as K, LowerBack as LB, Shoulder as SH};
use Need::{Body as B, Dumbbell as D, Gym as G};
use Pattern::*;

pub static LIBRARY: &[Exercise] = &[
    // Squat
    main("back_squat", "Back squat", Squat, &[K, LB], 5.0),
    ex("hack_squat", "Hack squat", Squat, G, &[K], 5.0),
    ex("leg_press", "Leg press", Squat, G, &[], 10.0),
    ex("goblet_squat", "Goblet squat", Squat, D, &[K], 2.0),
    ex("goblet_box_squat", "Goblet box squat", Squat, D, &[], 2.0),
    ex("tempo_squat", "Tempo bodyweight squat", Squat, B, &[], 0.0),
    // Hinge
    ex("rdl", "Romanian deadlift", Hinge, G, &[LB], 5.0),
    main("deadlift", "Deadlift", Hinge, &[LB], 5.0),
    ex("db_rdl", "Dumbbell Romanian deadlift", Hinge, D, &[LB], 2.0),
    ex("back_extension", "45° back extension", Hinge, G, &[], 2.5),
    ex("single_leg_rdl", "Single-leg Romanian deadlift", Hinge, D, &[], 2.0),
    ex("bw_single_leg_rdl", "Single-leg hip hinge", Hinge, B, &[], 0.0),
    // Lunge
    ex("bulgarian", "Bulgarian split squat", Lunge, D, &[K], 2.0),
    ex("walking_lunge", "Walking lunge", Lunge, D, &[K], 2.0),
    ex("step_up", "Step-up", Lunge, D, &[], 2.0),
    ex("reverse_lunge", "Reverse lunge", Lunge, B, &[], 0.0),
    // Knee extension
    ex("leg_extension", "Leg extension", KneeExtension, G, &[K], 5.0),
    ex("spanish_squat", "Spanish squat (band)", KneeExtension, B, &[], 0.0),
    ex("sissy_squat", "Sissy squat", KneeExtension, B, &[K], 0.0),
    // Knee flexion
    ex("seated_leg_curl", "Seated leg curl", KneeFlexion, G, &[], 5.0),
    ex("lying_leg_curl", "Lying leg curl", KneeFlexion, G, &[], 5.0),
    ex("db_leg_curl", "Dumbbell leg curl", KneeFlexion, D, &[], 2.0),
    ex("slider_leg_curl", "Slider leg curl", KneeFlexion, B, &[], 0.0),
    ex("nordic_curl", "Nordic hamstring curl", KneeFlexion, B, &[K], 0.0),
    // Hip thrust
    ex("hip_thrust", "Barbell hip thrust", HipThrust, G, &[], 5.0),
    ex("db_hip_thrust", "Dumbbell hip thrust", HipThrust, D, &[], 2.0),
    ex("single_leg_bridge", "Single-leg glute bridge", HipThrust, B, &[], 0.0),
    // Horizontal press
    main("bench", "Bench press", HorizontalPress, &[SH], 2.5),
    ex("db_bench", "Dumbbell bench press", HorizontalPress, D, &[], 2.0),
    ex("machine_chest_press", "Machine chest press", HorizontalPress, G, &[], 5.0),
    ex("push_up", "Push-up", HorizontalPress, B, &[], 0.0),
    // Incline press
    ex("incline_db", "Incline dumbbell press", InclinePress, D, &[], 2.0),
    ex("incline_bench", "Incline bench press", InclinePress, G, &[SH], 2.5),
    ex("feet_up_push_up", "Feet-elevated push-up", InclinePress, B, &[], 0.0),
    // Vertical press
    main("ohp", "Overhead press", VerticalPress, &[SH, LB], 2.5),
    ex("landmine_press", "Landmine press", VerticalPress, G, &[], 2.5),
    ex("db_shoulder_press", "Seated dumbbell shoulder press", VerticalPress, D, &[SH], 2.0),
    ex("machine_shoulder_press", "Machine shoulder press", VerticalPress, G, &[SH], 5.0),
    ex("pike_push_up", "Pike push-up", VerticalPress, B, &[SH], 0.0),
    ex("half_kneeling_band_press", "Half-kneeling band press", VerticalPress, B, &[], 0.0),
    // Horizontal pull
    ex("chest_supported_row", "Chest-supported row", HorizontalPull, G, &[], 5.0),
    ex("barbell_row", "Barbell row", HorizontalPull, G, &[LB], 2.5),
    ex("cable_row", "Seated cable row", HorizontalPull, G, &[], 5.0),
    ex("db_row", "One-arm dumbbell row", HorizontalPull, D, &[], 2.0),
    ex("inverted_row", "Inverted row", HorizontalPull, B, &[], 0.0),
    // Vertical pull
    ex("lat_pulldown", "Lat pulldown", VerticalPull, G, &[], 5.0),
    ex("pull_up", "Pull-up", VerticalPull, B, &[], 0.0),
    ex("chin_up", "Chin-up", VerticalPull, B, &[], 0.0),
    ex("band_pulldown", "Band lat pulldown", VerticalPull, B, &[], 0.0),
    // Chest fly
    ex("cable_fly", "Cable fly", ChestFly, G, &[], 2.5),
    ex("pec_deck", "Pec deck", ChestFly, G, &[], 5.0),
    ex("db_fly", "Dumbbell fly", ChestFly, D, &[SH], 1.0),
    ex("band_fly", "Band chest fly", ChestFly, B, &[], 0.0),
    // Lateral raise
    ex("cable_lateral", "Cable lateral raise", LateralRaise, G, &[], 1.25),
    ex("db_lateral", "Dumbbell lateral raise", LateralRaise, D, &[], 1.0),
    ex("band_lateral", "Band lateral raise", LateralRaise, B, &[], 0.0),
    // Rear delt
    ex("reverse_pec_deck", "Reverse pec deck", RearDelt, G, &[], 2.5),
    ex("face_pull", "Face pull", RearDelt, G, &[], 2.5),
    ex("db_rear_fly", "Dumbbell rear-delt fly", RearDelt, D, &[], 1.0),
    ex("band_pull_apart", "Band pull-apart", RearDelt, B, &[], 0.0),
    // Curl
    ex("ez_curl", "EZ-bar curl", Curl, G, &[], 2.5),
    ex("incline_curl", "Incline dumbbell curl", Curl, D, &[], 1.0),
    ex("cable_curl", "Cable curl", Curl, G, &[], 2.5),
    ex("hammer_curl", "Hammer curl", Curl, D, &[], 1.0),
    ex("band_curl", "Band curl", Curl, B, &[], 0.0),
    // Triceps
    ex("pushdown", "Cable pushdown", TricepsExtension, G, &[], 2.5),
    ex("overhead_cable_ext", "Overhead cable extension", TricepsExtension, G, &[SH], 2.5),
    ex("skull_crusher", "EZ-bar skull crusher", TricepsExtension, G, &[], 2.5),
    ex("db_overhead_ext", "Dumbbell overhead extension", TricepsExtension, D, &[SH], 1.0),
    ex("db_kickback", "Dumbbell kickback", TricepsExtension, D, &[], 1.0),
    ex("close_grip_push_up", "Close-grip push-up", TricepsExtension, B, &[], 0.0),
    // Calves
    ex("standing_calf", "Standing calf raise", Calf, G, &[], 5.0),
    ex("seated_calf", "Seated calf raise", Calf, G, &[], 5.0),
    ex("db_calf", "Single-leg dumbbell calf raise", Calf, D, &[], 2.0),
    ex("bw_calf", "Bodyweight calf raise", Calf, B, &[], 0.0),
    // Core
    ex("cable_crunch", "Cable crunch", Core, G, &[], 2.5),
    ex("hanging_leg_raise", "Hanging leg raise", Core, B, &[], 0.0),
    ex("dead_bug", "Dead bug", Core, B, &[], 0.0),
    ex("ab_wheel", "Ab-wheel rollout", Core, B, &[LB], 0.0),
];

/// Candidates for a pattern in preference order, after equipment and joints.
/// If joints rule out everything, fall back to equipment only (the session
/// note then says to work in a pain-free range).
pub fn candidates(pattern: Pattern, eq: Equipment, limits: &[Limit], prefer_main: bool) -> (Vec<&'static Exercise>, bool) {
    let fits = |e: &&Exercise| e.pattern == pattern && e.need.available(eq);
    let mut safe: Vec<&Exercise> = LIBRARY.iter().filter(fits).filter(|e| !e.stress.iter().any(|s| limits.contains(s))).collect();
    let mut relaxed = false;
    if safe.is_empty() {
        safe = LIBRARY.iter().filter(fits).collect();
        relaxed = true;
    }
    if prefer_main {
        // Stable sort keeps preference order within each group.
        safe.sort_by_key(|e| !e.main);
    }
    (safe, relaxed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_pattern_has_an_option_for_every_kit() {
        use Pattern::*;
        let all = [
            Squat, Hinge, Lunge, KneeExtension, KneeFlexion, HipThrust, HorizontalPress, InclinePress, VerticalPress,
            HorizontalPull, VerticalPull, ChestFly, LateralRaise, RearDelt, Curl, TricepsExtension, Calf, Core,
        ];
        for p in all {
            for eq in [Equipment::Gym, Equipment::Dumbbell, Equipment::Home] {
                let (c, _) = candidates(p, eq, &[], false);
                assert!(!c.is_empty(), "{p:?} with {eq:?}");
            }
        }
    }

    #[test]
    fn ids_are_unique() {
        let mut ids: Vec<_> = LIBRARY.iter().map(|e| e.id).collect();
        ids.sort();
        let n = ids.len();
        ids.dedup();
        assert_eq!(n, ids.len());
    }

    #[test]
    fn bad_knees_skip_back_squat() {
        let (c, relaxed) = candidates(Pattern::Squat, Equipment::Gym, &[Limit::Knee], false);
        assert!(!relaxed);
        assert!(c.iter().all(|e| e.id != "back_squat" && e.id != "hack_squat"));
    }
}
