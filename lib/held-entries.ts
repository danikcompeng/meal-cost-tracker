// Where a deleted entry was, so Undo puts it back in the same place.
//
// Today notes the spot when you delete (holdEntry: the entry above it in
// its meal), and Undo shows the entry there straight away, before the
// server has it back (withHeld, through lib/optimistic-entries.ts).
// Pure, so it can be unit tested.

import type { MealEntry } from "./types";

/** An entry kept on screen, and the entry just above it in its meal. */
export type Held = { entry: MealEntry; afterId: string | null };

/** Remembers where `entry` sits in `list` (the list as shown). */
export function holdEntry(list: readonly MealEntry[], entry: MealEntry): Held {
  const meal = list.filter((e) => e.meal === entry.meal);
  const index = meal.findIndex((e) => e.id === entry.id);
  return { entry, afterId: index > 0 ? meal[index - 1].id : null };
}

/**
 * `list` with the held entries the server no longer sends put back in
 * their place: after the entry that was above them, or first in their
 * meal if none was (or that one is gone too: then last in their meal).
 * Held entries still in `list` are left where they are.
 */
export function withHeld(list: readonly MealEntry[], held: readonly Held[]): MealEntry[] {
  const result = [...list];
  for (const { entry, afterId } of held) {
    if (result.some((e) => e.id === entry.id)) continue;
    const after = afterId === null ? -1 : result.findIndex((e) => e.id === afterId);
    if (after !== -1) {
      result.splice(after + 1, 0, entry);
      continue;
    }
    const sameMeal = result.map((e, i) => (e.meal === entry.meal ? i : -1)).filter((i) => i !== -1);
    if (afterId === null && sameMeal.length > 0) result.splice(sameMeal[0], 0, entry);
    else if (sameMeal.length > 0) result.splice(sameMeal[sameMeal.length - 1] + 1, 0, entry);
    else result.push(entry);
  }
  return result;
}
