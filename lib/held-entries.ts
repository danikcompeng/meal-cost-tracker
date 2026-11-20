// Keeping a deleted entry on Today a little longer, in its place.
//
// Deleting from the edit sheet: the sheet covers Today while it waits for
// the server, and the row should slide away only once the sheet has
// closed, where you can see it. But the server's fresh list (sent with
// its answer) may already have dropped the row by then. So Today "holds"
// it: it stays on screen, where it was, until Today lets go.
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
