//! Meal suggestions: a curated recipe list, scored against what is left of
//! the day. Deterministic: same day, same log, same suggestions.

use super::Goal;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Slot {
    Breakfast,
    Lunch,
    Dinner,
    Snack,
}

impl Slot {
    /// Rough share of the day's food each meal carries.
    fn share(self) -> f64 {
        match self {
            Slot::Breakfast => 0.25,
            Slot::Lunch => 0.35,
            Slot::Dinner => 0.30,
            Slot::Snack => 0.10,
        }
    }
    pub fn label(self) -> &'static str {
        match self {
            Slot::Breakfast => "breakfast",
            Slot::Lunch => "lunch",
            Slot::Dinner => "dinner",
            Slot::Snack => "snack",
        }
    }
}

/// What a dish contains, from most to least restrictive.
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    Vegan,
    Vegetarian,
    Egg,
    Fish,
    Meat,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Diet {
    Any,
    Pescatarian,
    Eggetarian,
    Vegetarian,
    Vegan,
}

impl Diet {
    pub fn parse(s: &str) -> Diet {
        match s {
            "pescatarian" => Diet::Pescatarian,
            "eggetarian" => Diet::Eggetarian,
            "vegetarian" => Diet::Vegetarian,
            "vegan" => Diet::Vegan,
            _ => Diet::Any,
        }
    }
    fn allows(self, k: Kind) -> bool {
        match self {
            Diet::Any => true,
            Diet::Pescatarian => k != Kind::Meat,
            Diet::Eggetarian => k <= Kind::Egg,
            Diet::Vegetarian => k <= Kind::Vegetarian,
            Diet::Vegan => k == Kind::Vegan,
        }
    }
}

pub struct Recipe {
    pub id: &'static str,
    pub name: &'static str,
    pub slots: &'static [Slot],
    pub kind: Kind,
    /// What one portion is.
    pub serving: &'static str,
    /// (quantity per portion, unit, item); quantity 0 means "to taste".
    pub ingredients: &'static [(f64, &'static str, &'static str)],
    pub steps: &'static [&'static str],
    pub minutes: u16,
    pub kcal: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fat: f64,
    pub fiber: f64,
}

use Kind::{Egg as E, Fish as Fi, Meat as M, Vegan as V, Vegetarian as Vg};
use Slot::{Breakfast as B, Dinner as D, Lunch as L, Snack as S};

#[allow(clippy::too_many_arguments)]
const fn r(
    id: &'static str,
    name: &'static str,
    slots: &'static [Slot],
    kind: Kind,
    serving: &'static str,
    ingredients: &'static [(f64, &'static str, &'static str)],
    steps: &'static [&'static str],
    minutes: u16,
    kcal: f64,
    protein: f64,
    carbs: f64,
    fat: f64,
    fiber: f64,
) -> Recipe {
    Recipe { id, name, slots, kind, serving, ingredients, steps, minutes, kcal, protein, carbs, fat, fiber }
}

/// Typical home-cooked versions; values are per portion and approximate.
pub static RECIPES: &[Recipe] = &[
    // ——— Breakfast
    r("masala_omelette", "Masala omelette with toast", &[B], E, "3 eggs, 1 slice", &[(3.0, "", "eggs"), (0.5, "", "small onion, finely chopped"), (0.5, "", "tomato, chopped"), (1.0, "", "green chilli, chopped"), (1.0, "tbsp", "coriander leaves"), (1.0, "tsp", "oil"), (1.0, "slice", "wholewheat bread"), (0.0, "", "salt, turmeric, black pepper")], &["Whisk the eggs with salt, a pinch of turmeric and pepper.", "Heat the oil in a non-stick pan over medium heat. Soften the onion and chilli for 1–2 minutes.", "Add the tomato for a minute, then spread the vegetables evenly over the pan.", "Pour in the eggs, tilt to cover the pan, and cook until the edges set, about 2 minutes.", "Scatter the coriander, fold, and cook 30 seconds more. Serve with the toast."], 10, 357.0, 24.0, 19.0, 20.0, 3.0),
    r("egg_white_omelette", "Egg-white veggie omelette", &[B], E, "200 g whites, 2 slices", &[(200.0, "g", "egg whites"), (1.0, "cup", "spinach"), (0.5, "", "bell pepper, diced"), (4.0, "", "mushrooms, sliced"), (1.0, "tsp", "oil"), (2.0, "slice", "wholewheat bread"), (0.0, "", "salt, pepper, chilli flakes")], &["Sauté the mushrooms and pepper in the oil for 3 minutes, then add the spinach until it wilts.", "Season the whites and pour them over the vegetables. Turn the heat to low.", "Cover and cook 3–4 minutes until set, then fold and slide out.", "Toast the bread and serve."], 12, 331.0, 31.0, 33.0, 7.0, 5.0),
    r("scrambled_avocado", "Scrambled eggs, avocado toast", &[B], E, "3 eggs, 2 slices", &[(3.0, "", "eggs"), (0.5, "", "ripe avocado"), (2.0, "slice", "wholewheat bread"), (1.0, "tsp", "butter"), (0.25, "", "lemon"), (0.0, "", "salt, pepper, chilli flakes")], &["Toast the bread. Mash the avocado with salt, pepper and a squeeze of lemon, and spread it on the toast.", "Whisk the eggs with a pinch of salt.", "Melt the butter over low heat. Add the eggs and stir slowly with a spatula until just set and creamy, 2–3 minutes.", "Spoon onto the toast and finish with chilli flakes."], 10, 572.0, 29.0, 37.0, 35.0, 9.0),
    r("yogurt_parfait", "Greek yogurt parfait", &[B, S], Vg, "1 bowl", &[(250.0, "g", "plain Greek yogurt"), (100.0, "g", "berries"), (30.0, "g", "rolled oats"), (1.0, "tsp", "honey"), (0.0, "", "cinnamon")], &["Optional: toast the oats in a dry pan for 2–3 minutes until fragrant.", "Layer half the yogurt, then half the berries and oats in a glass. Repeat.", "Drizzle with honey and add a pinch of cinnamon."], 5, 339.0, 30.0, 49.0, 4.0, 5.0),
    r("protein_oats", "Overnight protein oats", &[B], Vg, "1 jar", &[(50.0, "g", "rolled oats"), (200.0, "ml", "milk"), (1.0, "scoop", "whey protein (30 g)"), (0.5, "", "banana"), (0.0, "", "cinnamon")], &["In a jar, stir the whey into the milk until smooth.", "Add the oats and cinnamon, stir, cover and refrigerate overnight (at least 4 hours).", "In the morning, top with sliced banana. Eat it cold, or warm it for 1 minute."], 5, 463.0, 38.0, 60.0, 9.0, 6.0),
    r("besan_chilla", "Besan chilla with mint chutney", &[B], V, "2 chillas", &[(60.0, "g", "besan (gram flour)"), (100.0, "ml", "water"), (0.5, "", "onion, finely chopped"), (0.5, "", "tomato, finely chopped"), (0.25, "tsp", "ajwain"), (2.0, "tsp", "oil"), (2.0, "tbsp", "mint-coriander chutney"), (0.0, "", "salt, turmeric, green chilli")], &["Whisk the besan with salt, turmeric, ajwain and the water into a smooth, pourable batter. Rest it 5 minutes.", "Stir in the onion, tomato and chilli.", "Heat a tawa, brush with oil, pour in half the batter and spread it thin.", "Cook 2 minutes until the edges lift, flip, and cook 1–2 minutes more. Repeat with the rest.", "Serve with the chutney."], 15, 330.0, 13.0, 38.0, 13.0, 7.0),
    r("moong_cheela", "Moong dal cheela with curd", &[B], Vg, "2 cheelas, 100 g curd", &[(60.0, "g", "yellow moong dal, soaked 2 hours"), (1.0, "tsp", "grated ginger"), (1.0, "", "green chilli"), (1.0, "tsp", "oil"), (100.0, "g", "curd"), (0.0, "", "salt, cumin")], &["Drain the dal and grind it with the ginger, chilli and a little water to a smooth batter. Season with salt and cumin.", "Heat a non-stick tawa, brush with oil, and spread a ladle of batter thin.", "Cook until golden underneath, flip, and cook through, about 3 minutes in all. Repeat.", "Serve with the curd."], 15, 320.0, 18.0, 42.0, 9.0, 8.0),
    r("paneer_bhurji_roti", "Paneer bhurji with roti", &[B, L, D], Vg, "100 g paneer, 2 roti", &[(100.0, "g", "paneer, crumbled"), (1.0, "", "small onion, chopped"), (1.0, "", "tomato, chopped"), (0.5, "", "capsicum, chopped"), (1.0, "tsp", "oil"), (2.0, "", "roti"), (0.0, "", "cumin, turmeric, garam masala, salt, coriander")], &["Heat the oil, add cumin, then sauté the onion until soft, about 3 minutes.", "Add the capsicum and tomato with turmeric and salt. Cook until the tomato breaks down.", "Add the paneer and garam masala and toss for 2 minutes. Any longer and it turns rubbery.", "Finish with coriander and serve with warm roti."], 15, 575.0, 25.0, 41.0, 32.0, 6.0),
    r("poha", "Poha with peanuts", &[B], V, "1 plate", &[(60.0, "g", "thick poha"), (15.0, "g", "peanuts"), (0.5, "", "onion, chopped"), (2.0, "tbsp", "peas"), (8.0, "", "curry leaves"), (1.0, "tsp", "oil"), (0.5, "", "lemon"), (0.0, "", "mustard seeds, turmeric, salt, a pinch of sugar")], &["Rinse the poha in a sieve until soft but not mushy. Drain, then season with salt, turmeric and the sugar.", "Roast the peanuts in the oil, then add the mustard seeds and curry leaves.", "Add the onion and peas and cook 3 minutes.", "Fold in the poha, cover, and steam on low for 2 minutes. Finish with lemon and coriander."], 15, 355.0, 9.0, 52.0, 12.0, 4.0),
    r("idli_sambar", "Idli with sambar", &[B], V, "4 idli, 1 cup sambar", &[(4.0, "", "idli (about 160 g batter)"), (1.0, "cup", "sambar"), (0.0, "", "coconut chutney, optional")], &["Grease the idli moulds and fill each three-quarters with batter.", "Steam 10–12 minutes until a toothpick comes out clean. Rest 2 minutes before unmoulding.", "Heat the sambar and serve alongside, with chutney if you like."], 10, 372.0, 15.0, 68.0, 5.0, 6.0),
    r("upma", "Vegetable upma", &[B], V, "1 bowl", &[(50.0, "g", "rava (semolina)"), (180.0, "ml", "water"), (0.5, "", "carrot, diced"), (2.0, "tbsp", "peas"), (5.0, "", "green beans, chopped"), (2.0, "tsp", "oil"), (0.0, "", "mustard seeds, curry leaves, green chilli, salt")], &["Dry-roast the rava until fragrant and set it aside.", "Heat the oil, add mustard seeds, curry leaves and chilli, then cook the vegetables for 3 minutes.", "Add the water and salt and bring to a boil.", "Turn the heat to low and rain in the rava, stirring so it doesn't lump. Cover for 2 minutes, then fluff and serve."], 15, 290.0, 7.0, 42.0, 10.0, 4.0),
    r("pb_banana_toast", "Peanut butter banana toast", &[B, S], V, "2 slices", &[(2.0, "slice", "wholewheat bread"), (2.0, "tbsp", "peanut butter"), (1.0, "", "banana"), (0.0, "", "cinnamon")], &["Toast the bread.", "Spread on the peanut butter, then top with banana slices and a pinch of cinnamon."], 5, 455.0, 17.0, 61.0, 18.0, 7.0),
    r("protein_smoothie", "Banana protein smoothie", &[B, S], Vg, "1 large glass", &[(250.0, "ml", "milk"), (1.0, "scoop", "whey protein (30 g)"), (1.0, "", "banana, frozen is best"), (1.0, "tbsp", "peanut butter"), (20.0, "g", "rolled oats"), (0.0, "", "ice")], &["Pour in the milk first, then add everything else to the blender.", "Blend 45–60 seconds until smooth. Add ice or water to adjust the thickness."], 5, 520.0, 40.0, 58.0, 16.0, 5.0),
    r("cottage_bowl", "Cottage cheese, apple & almonds", &[B, S], Vg, "1 bowl", &[(200.0, "g", "cottage cheese"), (1.0, "", "apple, diced"), (15.0, "g", "almonds, chopped"), (0.0, "", "cinnamon")], &["Spoon the cottage cheese into a bowl.", "Top with the apple and almonds and dust with cinnamon."], 5, 351.0, 26.0, 37.0, 12.0, 6.0),
    r("egg_bhurji_paratha", "Egg bhurji with a plain paratha", &[B], E, "3 eggs, 1 paratha", &[(3.0, "", "eggs, beaten"), (1.0, "", "small onion, chopped"), (1.0, "", "tomato, chopped"), (1.0, "", "green chilli"), (1.0, "tsp", "oil"), (1.0, "", "plain paratha"), (0.0, "", "turmeric, chilli powder, salt")], &["Sauté the onion and chilli in the oil until soft. Add the tomato, turmeric, chilli powder and salt and cook 2 minutes.", "Pour in the eggs and scramble over medium heat until just set.", "Warm the paratha on a tawa and serve it alongside."], 15, 520.0, 24.0, 38.0, 30.0, 4.0),
    // ——— Lunch & dinner
    r("chicken_rice_bowl", "Chicken rice bowl", &[L, D], M, "150 g chicken, 1 cup rice", &[(150.0, "g", "chicken breast"), (60.0, "g", "rice, uncooked (1 cup cooked)"), (1.5, "cup", "mixed vegetables: broccoli, peppers, carrot"), (1.0, "tsp", "oil"), (0.5, "", "lime"), (0.0, "", "salt, pepper, paprika, garlic powder")], &["Cook the rice in twice its volume of water, about 15 minutes.", "Season the chicken with salt, pepper, paprika and garlic powder.", "Sear it in the oil over medium-high heat, 5–6 minutes a side, until it reaches 74 °C inside. Rest 5 minutes, then slice.", "Stir-fry the vegetables in the same pan for 4 minutes.", "Build the bowl: rice, then vegetables, then chicken. Squeeze over the lime."], 25, 543.0, 52.0, 55.0, 10.0, 4.0),
    r("chicken_curry_roti", "Chicken curry with roti", &[L, D], M, "150 g chicken, 2 roti", &[(150.0, "g", "chicken, boneless"), (1.0, "", "onion, finely chopped"), (1.0, "", "tomato, puréed"), (1.0, "tsp", "ginger-garlic paste"), (2.0, "tsp", "oil"), (150.0, "ml", "water"), (2.0, "", "roti"), (0.0, "", "turmeric, chilli, coriander powder, garam masala, salt")], &["Heat the oil and brown the onion, 6–8 minutes.", "Add the ginger-garlic paste for 1 minute, then the tomato and spices. Cook until the oil separates.", "Add the chicken and coat it, then pour in the water. Cover and simmer 15–18 minutes.", "Finish with garam masala and coriander, and serve with roti."], 35, 638.0, 54.0, 46.0, 22.0, 5.0),
    r("grilled_chicken_salad", "Grilled chicken salad", &[L, D], M, "1 large bowl", &[(150.0, "g", "chicken breast"), (3.0, "cup", "mixed greens"), (0.5, "", "cucumber, sliced"), (1.0, "", "tomato, chopped"), (28.0, "g", "feta"), (1.0, "tbsp", "olive oil"), (0.5, "", "lemon"), (0.0, "", "oregano, salt, pepper")], &["Season the chicken with oregano, salt and pepper. Grill or pan-sear 5–6 minutes a side, rest, then slice.", "Whisk the olive oil, lemon juice, salt and pepper.", "Toss the greens, cucumber and tomato with the dressing. Top with the chicken and crumbled feta."], 20, 502.0, 52.0, 12.0, 26.0, 5.0),
    r("chicken_sandwich", "Chicken sandwich", &[L, S], M, "1 sandwich", &[(100.0, "g", "cooked chicken breast"), (2.0, "slice", "wholewheat bread"), (2.0, "", "lettuce leaves"), (0.5, "", "tomato, sliced"), (1.0, "tbsp", "light mayo"), (0.0, "", "mustard, pepper")], &["Shred or slice the chicken and mix it with the mayo, a little mustard and pepper.", "Layer on the bread with the lettuce and tomato. Toast it in a pan if you like it warm."], 10, 380.0, 36.0, 32.0, 10.0, 5.0),
    r("chicken_pasta", "Chicken & tomato pasta", &[L, D], M, "1 plate", &[(75.0, "g", "dry pasta"), (100.0, "g", "chicken breast, diced"), (200.0, "g", "canned chopped tomatoes"), (2.0, "", "garlic cloves, sliced"), (1.0, "tsp", "olive oil"), (0.0, "", "basil, salt, chilli flakes")], &["Boil the pasta in salted water until al dente, and keep a splash of the water.", "Sear the chicken in the oil for 5–6 minutes, then add the garlic for 30 seconds.", "Add the tomatoes and simmer 8 minutes.", "Toss in the pasta with a splash of pasta water, and finish with basil."], 25, 575.0, 45.0, 76.0, 9.0, 6.0),
    r("dal_rice_thali", "Dal, rice & sabzi", &[L, D], V, "1 thali", &[(50.0, "g", "toor or moong dal"), (60.0, "g", "rice"), (1.0, "cup", "seasonal vegetables"), (2.0, "tsp", "ghee or oil"), (0.0, "", "cumin, turmeric, garlic, salt")], &["Pressure-cook the dal with turmeric and 2 cups of water for 3 whistles, then whisk it smooth.", "Cook the rice in twice its volume of water for 15 minutes.", "Temper the cumin and garlic in half the ghee, pour it over the dal, and simmer 5 minutes.", "Stir-fry the vegetables in the rest of the ghee with salt and spices. Serve all three together."], 30, 585.0, 20.0, 91.0, 15.0, 13.0),
    r("rajma_chawal", "Rajma chawal", &[L, D], V, "1 cup rajma, 1 cup rice", &[(60.0, "g", "dry rajma, soaked overnight"), (1.0, "", "onion, chopped"), (1.0, "", "tomato, puréed"), (1.0, "tsp", "ginger-garlic paste"), (2.0, "tsp", "oil"), (60.0, "g", "rice"), (0.0, "", "cumin, chilli, coriander powder, garam masala, salt")], &["Pressure-cook the soaked rajma with salt for 6–7 whistles, until fully soft.", "Brown the onion in the oil, add the ginger-garlic paste, then the tomato and spices. Cook down to a thick masala.", "Add the rajma with its liquid and simmer 15 minutes, mashing a few beans to thicken it.", "Cook the rice and serve the rajma over it with sliced onion."], 40, 510.0, 19.0, 85.0, 10.0, 13.0),
    r("chole_roti", "Chole with roti", &[L, D], V, "1 cup chole, 2 roti", &[(60.0, "g", "dry chickpeas, soaked overnight"), (1.0, "", "onion, chopped"), (1.0, "", "tomato, puréed"), (1.0, "tsp", "ginger-garlic paste"), (2.0, "tsp", "oil"), (1.0, "tsp", "chole masala"), (2.0, "", "roti"), (0.0, "", "salt, lemon")], &["Pressure-cook the soaked chickpeas for 5–6 whistles.", "Make the masala: brown the onion in the oil, add the ginger-garlic paste, then the tomato and chole masala.", "Add the chickpeas with some cooking water and simmer 15 minutes, mashing a few to thicken.", "Serve with roti, onion and lemon."], 40, 590.0, 20.0, 81.0, 19.0, 15.0),
    r("paneer_tikka_plate", "Paneer tikka, salad & roti", &[L, D], Vg, "120 g paneer, 1 roti", &[(120.0, "g", "paneer, cubed"), (3.0, "tbsp", "hung curd or Greek yogurt"), (0.5, "", "capsicum, in chunks"), (0.5, "", "onion, in chunks"), (1.0, "tsp", "tikka masala"), (1.0, "", "roti"), (0.0, "", "lemon, salt, mint chutney, salad")], &["Mix the yogurt, tikka masala, salt and lemon. Coat the paneer and vegetables and rest 15 minutes.", "Skewer them and grill, air-fry at 200 °C, or pan-roast for 8–10 minutes, turning, until charred at the edges.", "Serve with salad, roti and mint chutney."], 25, 508.0, 29.0, 29.0, 30.0, 5.0),
    r("palak_paneer_roti", "Palak paneer with roti", &[L, D], Vg, "1 cup, 2 roti", &[(200.0, "g", "spinach"), (80.0, "g", "paneer, cubed"), (1.0, "", "onion, chopped"), (1.0, "", "tomato, chopped"), (1.0, "tsp", "ginger-garlic paste"), (1.0, "tsp", "oil"), (2.0, "", "roti"), (0.0, "", "cumin, garam masala, salt")], &["Blanch the spinach for 2 minutes, plunge it into cold water, then blend to a purée.", "Soften the onion in the oil, add the ginger-garlic paste and tomato, and cook down.", "Stir in the spinach and spices and simmer 5 minutes.", "Add the paneer and warm through for 2 minutes. Serve with roti."], 30, 560.0, 22.0, 46.0, 31.0, 7.0),
    r("egg_curry_rice", "Egg curry with rice", &[L, D], E, "3 eggs, 1 cup rice", &[(3.0, "", "eggs"), (1.0, "", "onion, chopped"), (1.0, "", "tomato, puréed"), (1.0, "tsp", "ginger-garlic paste"), (2.0, "tsp", "oil"), (60.0, "g", "rice"), (0.0, "", "turmeric, chilli, coriander powder, garam masala, salt")], &["Hard-boil the eggs for 9 minutes. Cool, peel and score them lightly.", "Brown the onion in the oil, add the ginger-garlic paste, tomato and spices, and cook to a thick masala.", "Add 150 ml water and simmer 5 minutes. Add the eggs and simmer 5 more.", "Serve with the rice."], 30, 541.0, 25.0, 56.0, 22.0, 3.0),
    r("grilled_fish_potatoes", "Grilled fish, potatoes & greens", &[L, D], Fi, "150 g fish", &[(150.0, "g", "salmon or rohu fillet"), (1.0, "", "medium potato"), (2.0, "cup", "greens: spinach or beans"), (1.0, "", "garlic clove"), (0.5, "", "lemon"), (0.0, "", "salt, pepper, paprika")], &["Cook the potato until tender: 8 minutes in the microwave or 45 in the oven.", "Season the fish. Sear it skin-side down for 4 minutes, flip, and cook 2–3 minutes more.", "Sauté the greens with the garlic for 2 minutes.", "Plate with a wedge of lemon."], 25, 510.0, 40.0, 43.0, 18.0, 6.0),
    r("tuna_wrap", "Tuna salad wrap", &[L, S], Fi, "1 wrap", &[(100.0, "g", "tuna, drained"), (1.0, "", "large wholewheat tortilla"), (2.0, "tbsp", "Greek yogurt"), (0.25, "", "red onion, finely chopped"), (1.0, "cup", "lettuce"), (0.0, "", "lemon, pepper")], &["Mix the tuna with the yogurt, onion, lemon and pepper.", "Warm the tortilla for 20 seconds in a dry pan.", "Fill with the lettuce and tuna, roll it tightly, and halve."], 10, 376.0, 34.0, 40.0, 7.0, 4.0),
    r("prawn_noodles", "Prawn stir-fry noodles", &[L, D], Fi, "1 bowl", &[(150.0, "g", "prawns, peeled"), (60.0, "g", "dry noodles"), (1.0, "cup", "bok choy"), (0.5, "", "bell pepper, sliced"), (1.0, "tbsp", "soy sauce"), (1.0, "tsp", "grated ginger"), (1.0, "", "garlic clove"), (1.0, "tsp", "oil")], &["Cook the noodles as the pack says, then drain and rinse.", "Stir-fry the garlic and ginger in the oil for 30 seconds. Add the prawns and cook 2 minutes until pink.", "Add the vegetables for 2 minutes, then the noodles and soy sauce. Toss over high heat for 1 minute."], 20, 470.0, 42.0, 52.0, 9.0, 4.0),
    r("tofu_stir_fry", "Tofu stir-fry with rice", &[L, D], V, "200 g tofu, 1 cup rice", &[(200.0, "g", "firm tofu"), (1.0, "tsp", "cornflour"), (1.0, "cup", "broccoli florets"), (0.5, "", "bell pepper, sliced"), (1.0, "tbsp", "soy sauce"), (1.0, "", "garlic clove"), (1.0, "tsp", "oil"), (60.0, "g", "rice")], &["Press the tofu for 10 minutes, cube it, and toss in the cornflour.", "Pan-fry in the oil until golden on all sides, 6–8 minutes, then set aside.", "Stir-fry the garlic, broccoli and pepper for 3 minutes. Return the tofu with the soy sauce and toss.", "Serve over the cooked rice."], 20, 603.0, 42.0, 66.0, 22.0, 7.0),
    r("soya_pulao", "Soya chunk pulao", &[L, D], V, "1 plate", &[(50.0, "g", "soya chunks"), (60.0, "g", "basmati rice"), (0.5, "cup", "peas"), (0.5, "", "onion, sliced"), (1.0, "tsp", "oil"), (120.0, "ml", "water"), (0.0, "", "bay leaf, cloves, cumin, salt")], &["Soak the soya chunks in hot salted water for 10 minutes, then squeeze them dry.", "Rinse the rice and soak it 15 minutes.", "Fry the whole spices and onion in the oil, then sauté the soya and peas for 3 minutes.", "Add the rice, the water and salt. Cover and cook on low for 12 minutes, rest 5, then fluff."], 30, 458.0, 31.0, 70.0, 6.0, 8.0),
    r("lentil_quinoa_bowl", "Lentil & quinoa bowl", &[L, D], V, "1 bowl", &[(80.0, "g", "dry lentils"), (45.0, "g", "dry quinoa"), (0.5, "", "cucumber, diced"), (1.0, "", "tomato, diced"), (1.0, "tbsp", "olive oil"), (0.5, "", "lemon"), (0.0, "", "herbs, salt, pepper")], &["Simmer the lentils in water for about 20 minutes until tender, then drain.", "Rinse the quinoa and cook it in twice its volume of water for 15 minutes. Fluff with a fork.", "Whisk the olive oil, lemon, salt and pepper.", "Toss everything with the vegetables and herbs. It keeps 3 days in the fridge."], 15, 481.0, 23.0, 66.0, 17.0, 20.0),
    r("veg_dal_roti", "Mixed veg, dal & roti", &[L, D], V, "1 plate", &[(40.0, "g", "dal"), (1.5, "cup", "mixed vegetables"), (2.0, "tsp", "oil"), (2.0, "", "roti"), (0.0, "", "cumin, turmeric, garlic, salt")], &["Cook the dal with turmeric until soft, then temper it with cumin in half the oil.", "Cook the vegetables in the rest of the oil with the spices until tender.", "Serve both with warm roti."], 30, 555.0, 19.0, 74.0, 20.0, 14.0),
    r("khichdi_curd", "Khichdi with curd", &[D], Vg, "1½ cups, 100 g curd", &[(30.0, "g", "moong dal"), (40.0, "g", "rice"), (1.0, "tsp", "ghee"), (1.0, "tsp", "grated ginger"), (750.0, "ml", "water"), (100.0, "g", "curd"), (0.0, "", "cumin, turmeric, salt")], &["Rinse the dal and rice together.", "Heat the ghee and add the cumin and ginger. Add the dal, rice, turmeric, salt and water.", "Pressure-cook for 3–4 whistles until soft and porridge-like.", "Serve with the curd."], 25, 410.0, 17.0, 65.0, 9.0, 8.0),
    r("curd_rice", "Curd rice with salad", &[L, D], Vg, "1 bowl", &[(60.0, "g", "rice"), (150.0, "g", "curd"), (1.0, "tsp", "oil"), (0.0, "", "mustard seeds, curry leaves, green chilli, salt"), (0.5, "", "cucumber, for salad")], &["Cook the rice until slightly soft, then cool it to room temperature.", "Mix in the curd and salt, with a splash of milk if it's thick.", "Temper the mustard seeds, curry leaves and chilli in the oil and pour over.", "Serve with cucumber salad."], 10, 360.0, 10.0, 58.0, 9.0, 3.0),
    // ——— Snacks
    r("roasted_chana", "Roasted chana", &[S], V, "40 g", &[(40.0, "g", "roasted chana"), (0.0, "", "chaat masala, lemon")], &["Toss with chaat masala and a squeeze of lemon."], 0, 150.0, 9.0, 24.0, 3.0, 7.0),
    r("greek_yogurt_honey", "Greek yogurt with honey", &[S], Vg, "170 g", &[(170.0, "g", "plain Greek yogurt"), (1.0, "tsp", "honey")], &["Spoon into a bowl and drizzle with honey."], 2, 121.0, 17.0, 12.0, 1.0, 0.0),
    r("whey_shake", "Whey shake", &[S], Vg, "1 scoop", &[(1.0, "scoop", "whey protein (30 g)"), (300.0, "ml", "cold water")], &["Shake with the cold water for 15 seconds."], 1, 120.0, 24.0, 3.0, 2.0, 0.0),
    r("apple_pb", "Apple with peanut butter", &[S], V, "1 apple, 1 tbsp", &[(1.0, "", "apple"), (1.0, "tbsp", "peanut butter")], &["Slice the apple and dip it in, or spread it with, the peanut butter."], 2, 189.0, 5.0, 28.0, 8.0, 5.0),
    r("boiled_eggs", "Boiled eggs", &[S, B], E, "2 eggs", &[(2.0, "", "eggs"), (0.0, "", "salt, pepper")], &["Lower the eggs into boiling water. Cook 9 minutes for firm yolks, 7 for jammy.", "Cool in cold water for 2 minutes, then peel and season."], 10, 144.0, 13.0, 1.0, 10.0, 0.0),
    r("sprouts_chaat", "Sprouts chaat", &[S], V, "1 bowl", &[(150.0, "g", "moong sprouts"), (0.25, "", "onion, chopped"), (0.5, "", "tomato, chopped"), (10.0, "g", "peanuts"), (0.5, "", "lemon"), (0.0, "", "chaat masala, coriander")], &["Steam the sprouts for 3 minutes, or use them raw if they're fresh.", "Toss with the onion, tomato, peanuts, lemon and chaat masala."], 5, 137.0, 9.0, 16.0, 5.0, 4.0),
    r("almonds_dates", "Almonds & dates", &[S], V, "20 g, 2 dates", &[(20.0, "g", "almonds"), (2.0, "", "dates")], &["Portion them out and go. Soak the almonds overnight if you prefer them softer."], 0, 161.0, 4.0, 16.0, 10.0, 4.0),
    r("paneer_cubes", "Paneer cubes with chaat masala", &[S], Vg, "75 g", &[(75.0, "g", "paneer"), (0.0, "", "chaat masala, lemon")], &["Cube the paneer. If you like, sear it 1 minute a side in a dry pan.", "Sprinkle with chaat masala and a squeeze of lemon."], 2, 199.0, 14.0, 1.0, 16.0, 0.0),
    r("cottage_cucumber", "Cottage cheese & cucumber", &[S], Vg, "150 g", &[(150.0, "g", "cottage cheese"), (0.5, "", "cucumber"), (0.0, "", "black pepper")], &["Slice the cucumber and top it with the cottage cheese and black pepper."], 2, 141.0, 17.0, 9.0, 4.0, 1.0),
    r("banana_whey", "Banana & whey", &[S], Vg, "1 banana, 1 scoop", &[(1.0, "", "banana"), (1.0, "scoop", "whey protein (30 g)"), (300.0, "ml", "water")], &["Shake the whey with the water and eat the banana alongside. Good 30–60 minutes before training."], 2, 225.0, 25.0, 30.0, 2.0, 3.0),
    r("hummus_veg", "Hummus & veggie sticks", &[S], V, "60 g hummus", &[(60.0, "g", "hummus"), (1.0, "", "carrot"), (0.5, "", "cucumber"), (0.5, "", "bell pepper")], &["Cut the vegetables into sticks and serve with the hummus."], 5, 180.0, 5.0, 17.0, 10.0, 6.0),
    r("makhana", "Roasted makhana", &[S], Vg, "30 g", &[(30.0, "g", "makhana (fox nuts)"), (1.0, "tsp", "ghee"), (0.0, "", "salt, pepper")], &["Roast the makhana in the ghee on low heat for 6–8 minutes, stirring, until crisp.", "Season with salt and pepper. Let them cool before storing."], 5, 150.0, 3.0, 20.0, 6.0, 1.0),
];

pub fn by_id(id: &str) -> Option<&'static Recipe> {
    RECIPES.iter().find(|r| r.id == id)
}

/// Logged entries carry the dish name, so the diary can find its recipe again.
pub fn by_name(name: &str) -> Option<&'static Recipe> {
    RECIPES.iter().find(|r| r.name.eq_ignore_ascii_case(name.trim()))
}

pub fn ingredients(r: &Recipe) -> Vec<Ingredient> {
    r.ingredients.iter().map(|&(qty, unit, item)| Ingredient { qty, unit: unit.into(), item: item.into() }).collect()
}

/// A recipe as shown on its own, one portion.
#[derive(Serialize, Debug)]
pub struct RecipeView {
    pub id: String,
    pub name: String,
    pub kind: Kind,
    pub serving: String,
    pub minutes: u16,
    pub kcal: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fat: f64,
    pub fiber: f64,
    pub ingredients: Vec<Ingredient>,
    pub steps: Vec<String>,
}

pub fn view(r: &Recipe) -> RecipeView {
    RecipeView {
        id: r.id.into(),
        name: r.name.into(),
        kind: r.kind,
        serving: r.serving.into(),
        minutes: r.minutes,
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        fiber: r.fiber,
        ingredients: ingredients(r),
        steps: r.steps.iter().map(|x| x.to_string()).collect(),
    }
}

/// Everything the scorer needs to know about the day.
pub struct Context<'a> {
    pub slot: Slot,
    /// Meals not yet eaten today, including `slot`.
    pub open_slots: &'a [Slot],
    pub kcal_left: f64,
    pub protein_left: f64,
    pub goal: Goal,
    pub diet: Diet,
    /// Recipe names logged in the last few days, lowercased.
    pub recent: &'a [String],
    /// Only dishes ready in this many minutes, if set.
    pub max_minutes: Option<u16>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Budget {
    pub slot: Slot,
    pub kcal: f64,
    pub protein: f64,
    pub kcal_left: f64,
    pub protein_left: f64,
    pub over: bool,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Ingredient {
    /// For one portion of the recipe; the UI scales it by `portion`.
    pub qty: f64,
    pub unit: String,
    pub item: String,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Suggestion {
    pub id: String,
    pub name: String,
    pub kind: Kind,
    pub serving: String,
    pub ingredients: Vec<Ingredient>,
    pub steps: Vec<String>,
    pub minutes: u16,
    /// Multiplier on the recipe's portion, in quarters.
    pub portion: f64,
    pub kcal: f64,
    pub protein: f64,
    pub carbs: f64,
    pub fat: f64,
    pub fiber: f64,
    pub score: f64,
    pub reasons: Vec<String>,
}

/// The slice of what's left that this meal should take.
pub fn budget(cx: &Context) -> Budget {
    let total_share: f64 = cx.open_slots.iter().map(|s| s.share()).sum::<f64>().max(cx.slot.share());
    let frac = cx.slot.share() / total_share;
    let over = cx.kcal_left <= 50.0;
    let (floor, cap) = match cx.slot {
        Slot::Snack => (100.0, 450.0),
        _ => (250.0, 1100.0),
    };
    let kcal = if over { floor * 0.6 } else { (cx.kcal_left * frac).clamp(floor, cap) };
    let protein = (cx.protein_left.max(0.0) * frac).clamp(if cx.slot == Slot::Snack { 8.0 } else { 15.0 }, 70.0);
    Budget { slot: cx.slot, kcal: kcal.round(), protein: protein.round(), kcal_left: cx.kcal_left.round(), protein_left: cx.protein_left.max(0.0).round(), over }
}

fn quarter(v: f64) -> f64 {
    (v * 4.0).round() / 4.0
}

pub fn suggest(cx: &Context, limit: usize) -> (Budget, Vec<Suggestion>) {
    let b = budget(cx);
    // How much protein density matters, by goal.
    let density_weight = match cx.goal {
        Goal::Cut | Goal::Recomp => 0.30,
        Goal::Maintain => 0.15,
        Goal::LeanBulk | Goal::Strength => 0.10,
    };

    let mut out: Vec<Suggestion> = RECIPES
        .iter()
        .filter(|r| r.slots.contains(&cx.slot) && cx.diet.allows(r.kind))
        .filter(|r| cx.max_minutes.map_or(true, |m| r.minutes <= m))
        .map(|r| {
            // Scale the portion toward the budget, but keep it a sensible plate.
            let (lo, hi) = if cx.slot == Slot::Snack { (0.5, 1.5) } else { (0.75, 1.5) };
            let portion = quarter((b.kcal / r.kcal).clamp(lo, hi));
            let kcal = r.kcal * portion;
            let protein = r.protein * portion;

            let kcal_fit = 1.0 - ((kcal - b.kcal).abs() / b.kcal).min(1.0);
            let protein_fit = (protein / b.protein.max(1.0)).min(1.0);
            // Protein share of energy, ~0.4 at the top end of these recipes.
            let density = (r.protein * 4.0 / r.kcal / 0.4).min(1.0);
            let fiber = (r.fiber * portion / 8.0).min(1.0);
            let recent = cx.recent.iter().any(|n| n == &r.name.to_lowercase());

            let score = 0.35 * kcal_fit + 0.35 * protein_fit + density_weight * density + 0.05 * fiber
                - if recent { 0.25 } else { 0.0 }
                // A dish as written beats a scaled one.
                - 0.08 * (portion - 1.0).abs();

            let mut reasons = Vec::new();
            if b.over {
                reasons.push("You've hit today's calories; this is one of the lighter options.".to_string());
            } else if kcal_fit > 0.85 {
                reasons.push(format!("Fits your ~{:.0} kcal {} budget", b.kcal, cx.slot.label()));
            }
            if protein >= b.protein * 0.9 {
                reasons.push(format!("Covers the {:.0} g protein this meal needs", b.protein));
            } else if cx.protein_left > 0.0 && protein / cx.protein_left >= 0.25 {
                reasons.push(format!("{:.0}% of the protein you have left today", protein / cx.protein_left * 100.0));
            }
            if r.fiber * portion >= 8.0 {
                reasons.push("High in fibre".into());
            }
            if r.minutes <= 5 {
                reasons.push("Ready in 5 minutes".into());
            }
            if recent {
                reasons.push("You had this recently".into());
            }

            Suggestion {
                id: r.id.into(),
                name: r.name.into(),
                kind: r.kind,
                serving: r.serving.into(),
                ingredients: ingredients(r),
                steps: r.steps.iter().map(|x| x.to_string()).collect(),
                minutes: r.minutes,
                portion,
                kcal: kcal.round(),
                protein: (protein * 10.0).round() / 10.0,
                carbs: (r.carbs * portion * 10.0).round() / 10.0,
                fat: (r.fat * portion * 10.0).round() / 10.0,
                fiber: (r.fiber * portion * 10.0).round() / 10.0,
                score: (score * 1000.0).round() / 1000.0,
                reasons,
            }
        })
        .collect();

    // Highest score first (ties keep library order), then pick greedily with a
    // small penalty per dish of the same kind already chosen, so six chicken
    // dishes don't crowd out everything else.
    out.sort_by(|a, b| b.score.total_cmp(&a.score));
    let mut picked: Vec<Suggestion> = Vec::new();
    while picked.len() < limit && !out.is_empty() {
        let adjusted = |x: &Suggestion| x.score - 0.06 * picked.iter().filter(|p| p.kind == x.kind).count() as f64;
        let mut best = 0;
        for i in 1..out.len() {
            if adjusted(&out[i]) > adjusted(&out[best]) {
                best = i;
            }
        }
        picked.push(out.remove(best));
    }
    (b, picked)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cx<'a>(slot: Slot, open: &'a [Slot], kcal_left: f64, protein_left: f64, diet: Diet, recent: &'a [String]) -> Context<'a> {
        Context { slot, open_slots: open, kcal_left, protein_left, goal: Goal::LeanBulk, diet, recent, max_minutes: None }
    }

    #[test]
    fn breakfast_gets_breakfast_food() {
        let (b, s) = suggest(&cx(B, &[B, L, D, S], 2600.0, 150.0, Diet::Any, &[]), 6);
        assert_eq!(b.kcal, 650.0);
        assert!(!s.is_empty());
        for x in &s {
            assert!(by_id(&x.id).unwrap().slots.contains(&B), "{}", x.name);
        }
    }

    #[test]
    fn diet_is_respected() {
        for diet in [Diet::Vegan, Diet::Vegetarian, Diet::Eggetarian, Diet::Pescatarian] {
            for slot in [B, L, D, S] {
                let (_, s) = suggest(&cx(slot, &[slot], 2000.0, 120.0, diet, &[]), 50);
                assert!(!s.is_empty(), "{diet:?} {slot:?}");
                assert!(s.iter().all(|x| diet.allows(x.kind)), "{diet:?} {slot:?}");
            }
        }
    }

    #[test]
    fn later_meals_split_what_is_left() {
        // Only dinner left: it gets everything, up to the cap.
        let (b, _) = suggest(&cx(D, &[D], 700.0, 60.0, Diet::Any, &[]), 3);
        assert_eq!(b.kcal, 700.0);
        assert_eq!(b.protein, 60.0);
    }

    #[test]
    fn recent_meals_drop() {
        let first = suggest(&cx(L, &[L, D], 1500.0, 100.0, Diet::Any, &[]), 1).1.remove(0);
        let recent = vec![first.name.to_lowercase()];
        let next = suggest(&cx(L, &[L, D], 1500.0, 100.0, Diet::Any, &recent), 1).1.remove(0);
        assert_ne!(first.id, next.id);
    }

    #[test]
    fn over_budget_offers_light_food() {
        let (b, s) = suggest(&cx(S, &[S], -100.0, 0.0, Diet::Any, &[]), 3);
        assert!(b.over);
        assert!(s.iter().all(|x| x.kcal <= 200.0), "{:?}", s.iter().map(|x| x.kcal).collect::<Vec<_>>());
    }

    /// `TALLY_DUMP=1 cargo test dump_samples -- --nocapture` prints samples and
    /// writes the ones the browser mock serves (`src/dev/sample-meals.json`).
    #[test]
    fn dump_samples() {
        if std::env::var("TALLY_DUMP").is_err() {
            return;
        }
        let mut all = serde_json::Map::new();
        for (slot, open, left, p) in [(B, vec![B, L, D, S], 2650.0, 145.0), (L, vec![L, D, S], 2200.0, 120.0), (D, vec![D, S], 1100.0, 70.0), (S, vec![S], 300.0, 25.0)] {
            let (b, s) = suggest(&cx(slot, &open, left, p, Diet::Any, &[]), 6);
            println!("\n{slot:?}: {} kcal, {} g protein", b.kcal, b.protein);
            for x in &s {
                println!("  {:<38} ×{:<4} {:>4} kcal P{:<5} score {} {:?}", x.name, x.portion, x.kcal, x.protein, x.score, x.reasons);
            }
            all.insert(slot.label().into(), serde_json::json!({ "budget": b, "diet": "any", "goal": "lean_bulk", "suggestions": s }));
        }
        std::fs::write("../src/dev/sample-meals.json", serde_json::to_string_pretty(&all).unwrap()).unwrap();
    }

    #[test]
    fn every_recipe_can_be_cooked() {
        for r in RECIPES {
            assert!(r.ingredients.len() >= 2, "{}", r.id);
            assert!(!r.steps.is_empty(), "{}", r.id);
            assert_eq!(by_name(&r.name.to_uppercase()).map(|x| x.id), Some(r.id));
        }
    }

    #[test]
    fn deterministic() {
        let a = format!("{:?}", suggest(&cx(B, &[B, L, D], 2200.0, 140.0, Diet::Any, &[]), 6));
        let b = format!("{:?}", suggest(&cx(B, &[B, L, D], 2200.0, 140.0, Diet::Any, &[]), 6));
        assert_eq!(a, b);
    }
}
