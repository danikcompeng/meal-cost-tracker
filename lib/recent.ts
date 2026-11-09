// Puts the foods you logged most recently at the top of the picker, since
// you mostly eat the same few things. Pure, so it can be unit tested.

/**
 * `recentIds` is newest first and may repeat (you ate oats 5 times).
 * Recent foods come first in that order; the rest keep their order.
 */
export function orderByRecent<T extends { id: string }>(foods: T[], recentIds: string[]): T[] {
  const rank = new Map<string, number>();
  for (const id of recentIds) if (!rank.has(id)) rank.set(id, rank.size);

  return foods
    .map((food, index) => ({ food, index }))
    .sort((a, b) => {
      const ra = rank.get(a.food.id) ?? Infinity;
      const rb = rank.get(b.food.id) ?? Infinity;
      // Infinity - Infinity is NaN, so compare rather than subtract.
      if (ra !== rb) return ra < rb ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ food }) => food);
}
