import type { Macros } from "./macros";
import type { Meal } from "./meals";
import type { BaseUnit } from "./units";

/** Calories and macros are per 100 g, per 100 ml, or per 1 item ("each"). */
export type Food = Macros & {
  id: string;
  name: string;
  price: number;
  package_size: number;
  unit: BaseUnit;
};

/**
 * One thing you ate. Name, unit, macros and cost are a snapshot copied when
 * it was logged, for this amount. food_id is null if the food was deleted.
 */
export type MealEntry = Macros & {
  id: string;
  day: string;
  meal: Meal;
  food_id: string | null;
  name: string;
  unit: BaseUnit;
  amount: number;
  cost: number | null;
};

/** What a form action sends back to the form after it runs. */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};
