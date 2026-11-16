// The messages above Today's tab bar that name a meal. Pure, so they can
// be unit tested. The meal is always written with MEAL_LABELS as it is
// ("Breakfast", "Lunch", "Dinner", "Snack"), like the meal headings and
// the meal picker, never lowercased.

import { MEAL_LABELS, type Meal } from "./meals";
import { amountText } from "./units";

/** "Beef and rice deleted from Lunch" (Undo is the button next to it). */
export function deletedMessage(name: string, meal: Meal): string {
  return `${name} deleted from ${MEAL_LABELS[meal]}`;
}

/** "Lunch is now Lentil dal · 1.5 servings". */
export function swappedMessage(meal: Meal, recipeName: string, servings: number): string {
  return `${MEAL_LABELS[meal]} is now ${recipeName} · ${amountText(servings, "serving")}`;
}

/** An Undo of a swap failed after its message was replaced. */
export function swapNotUndoneMessage(meal: Meal, recipeName: string): string {
  return `Couldn't undo: ${MEAL_LABELS[meal]} is still ${recipeName}.`;
}
