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
