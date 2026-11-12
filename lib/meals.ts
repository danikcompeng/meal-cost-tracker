// The four meals of a day, always shown in this order.
export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** For the Breakfast / Lunch / Dinner / Snack switch. */
export const MEAL_OPTIONS = MEALS.map((m) => ({ value: m, label: MEAL_LABELS[m] }));

export function isMeal(value: unknown): value is Meal {
  return typeof value === "string" && (MEALS as readonly string[]).includes(value);
}

/**
 * A sensible meal for the time of day, so a scanned food is ready to log
 * with one tap. You can still change it. Breakfast 4 am-10 am, lunch
 * 11 am-2 pm, dinner 5 pm-9 pm, a snack any other time.
 */
export function mealForHour(hour: number): Meal {
  if (hour >= 4 && hour <= 10) return "breakfast";
  if (hour >= 11 && hour <= 14) return "lunch";
  if (hour >= 17 && hour <= 21) return "dinner";
  return "snack";
}
