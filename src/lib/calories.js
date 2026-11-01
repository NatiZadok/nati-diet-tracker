import { FOOD_BY_ID, FOOD_BY_GROUP, MEAL_DEFINITIONS } from '../data/foods.js';

export const DAILY_CALORIE_TARGET = MEAL_DEFINITIONS.reduce((sum, meal) => sum + meal.calories, 0);

// Values from the supplied substitution list are estimates per portion, not exact nutrition labels.
export function foodCalories(id) {
  const food = FOOD_BY_ID[id];
  if (!food) return 0;
  let amount = FOOD_BY_GROUP[food.group]?.calories || 0;
  if (food.label.includes('ביונד')) amount += FOOD_BY_GROUP.carb.calories;
  if (food.label.includes('יוגורט סויה עם 20 גרם')) amount += FOOD_BY_GROUP.carb.calories;
  if (food.label.includes('סלמון מעושן')) amount += FOOD_BY_GROUP.fat.calories;
  if (food.label.includes('סלים דליס')) amount = 99;
  return amount;
}

export const hasFood = (choices = {}) => Object.entries(choices).some(([key, value]) =>
  key !== 'mode' && key !== 'calorieOverride' && (key === 'snackbar' ? Boolean(value) : Boolean(FOOD_BY_ID[value]))
);

const filled = (c, key) => Boolean(FOOD_BY_ID[c?.[key]]);
const threeVeg = c => ['veg1', 'veg2', 'veg3', 'veg4'].filter(key => filled(c, key)).length >= 3;
const carbOrFats = c => c?.mode === 'fat' ? filled(c,'fat1') && filled(c,'fat2') : filled(c,'carb');

// A completed meal needs all mandatory components; partial logs do not qualify.
export function mealComplete(mealNo, choices = {}) {
  switch (Number(mealNo)) {
    case 1: return filled(choices,'carb') && filled(choices,'protein1') && filled(choices,'veg1');
    case 2: return carbOrFats(choices) && filled(choices,'protein1') && filled(choices,'protein2') && threeVeg(choices);
    case 3: return choices.mode === 'bar' ? Boolean(choices.snackbar) : carbOrFats(choices) && filled(choices,'protein1');
    case 4: return filled(choices,'protein1') && threeVeg(choices);
    default: return false;
  }
}

export function estimatedMealCalories(choices = {}) {
  if (choices.mode === 'bar' && choices.snackbar) return 210; // listed maximum for the selected bar
  return Object.entries(choices).reduce((total, [key, value]) => {
    if (key === 'mode' || key === 'calorieOverride' || key === 'snackbar') return total;
    return total + foodCalories(value);
  }, 0);
}

export function mealCalories(choices = {}) {
  const estimated = estimatedMealCalories(choices);
  const manuallyEntered = choices.calorieOverride !== '' && choices.calorieOverride != null &&
    Number.isInteger(Number(choices.calorieOverride)) && Number(choices.calorieOverride) >= 0 && Number(choices.calorieOverride) <= 5000;
  return { estimated, value: hasFood(choices) ? (manuallyEntered ? Number(choices.calorieOverride) : estimated) : 0,
    manuallyEntered: hasFood(choices) && manuallyEntered };
}

export function dayMealStats(entries = {}) {
  const items = MEAL_DEFINITIONS.map(meal => {
    const choices = entries[meal.no] || {};
    return { mealNo: meal.no, target: meal.calories, complete: mealComplete(meal.no, choices), logged: hasFood(choices), ...mealCalories(choices) };
  });
  return { items, completed: items.filter(x => x.complete).length, logged: items.filter(x => x.logged).length,
    actual: items.reduce((sum, x) => sum + x.value, 0),
    estimated: items.reduce((sum, x) => sum + x.estimated, 0),
    target: DAILY_CALORIE_TARGET, allComplete: items.every(x => x.complete) };
}
