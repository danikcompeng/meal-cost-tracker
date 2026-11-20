"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Plus } from "lucide-react";
import { dayTotals, totalNumber } from "@/lib/day-totals";
import { MEAL_LABELS, type Meal } from "@/lib/meals";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { MealEntry } from "@/lib/types";
import { EntryRow } from "./entry-row";

/**
 * How a deleted row leaves: the space it took closes up, so the rows below
 * move up.
 * - Deleted with its own red Delete (`wasSlidOff`): it has just slid
 *   off to the left, leaving red behind (EntryRow), so the gap waits
 *   DURATION.slow for that slide, then the red closes up.
 * - Deleted from the edit sheet: no slide, so it fades and closes at once.
 * - Reduce Motion: MotionProvider makes height jump, so height: 0 would
 *   hide the row at once, fade and all: only the fade, then the rows
 *   below jump up.
 */
function leaveVariants(id: string, reduceMotion: boolean | null): Variants {
  return {
    leave: (wasSlidOff: ((id: string) => boolean) | undefined) => {
      if (reduceMotion) return { opacity: 0 };
      const delay = wasSlidOff?.(id) ? DURATION.slow : 0;
      return { opacity: 0, height: 0, transition: { duration: DURATION.base, ease: EASE_OUT, delay } };
    },
  };
}

// One meal of the day: heading with its calories, the foods, and an add
// button. An empty meal is just one big "+ Add to breakfast" button.
export function MealSection({
  meal,
  entries,
  onAdd,
  onOpen,
  onSwap,
  openRow,
  onOpenRow,
  onDelete,
}: {
  meal: Meal;
  entries: MealEntry[];
  onAdd: () => void;
  onOpen: (entry: MealEntry) => void;
  /** "Tired of this?" on a recipe entry. */
  onSwap: (entry: MealEntry) => void;
  /** The entry swiped open to show its Delete button, on any meal. */
  openRow: string | null;
  /** You swiped (or tapped) this entry open or shut. */
  onOpenRow: (entryId: string, open: boolean) => void;
  /** Delete tapped on a swiped-open entry. */
  onDelete: (entry: MealEntry) => void;
}) {
  const reduceMotion = useReducedMotion();
  // Rows deleted with their own Delete button: they slide off first (in
  // EntryRow), so the gap waits for that. A ref, not state: nothing on
  // screen depends on it, it's only read as a row starts leaving.
  const slidOff = useRef(new Set<string>());
  const wasSlidOff = useCallback((id: string) => slidOff.current.has(id), []);
  // A row that comes back (Undo, or the delete failed) is a normal row
  // again: deleted later from the edit sheet, it mustn't wait for a slide.
  useEffect(() => {
    for (const id of slidOff.current) {
      if (entries.some((e) => e.id === id)) slidOff.current.delete(id);
    }
  }, [entries]);
  const label = MEAL_LABELS[meal];
  const kcal = dayTotals(entries).kcal;
  const headingId = `meal-${meal}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-1 flex items-baseline justify-between px-3">
        <h2 id={headingId} className="font-medium">
          {label}
        </h2>
        {entries.length > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {totalNumber(kcal)} kcal
            {kcal.missing > 0 && kcal.sum !== null && ` · ${kcal.missing} unknown`}
          </span>
        )}
      </div>

      {/* Always on the page, even with no entries: the last one deleted
          still has to slide off and close up inside it. */}
      <ul>
        {/* custom: asks whether a row slid off, at the moment it starts
            leaving (after its Delete has added it to the set). */}
        <AnimatePresence initial={false} custom={wasSlidOff}>
          {entries.map((entry) => (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              variants={leaveVariants(entry.id, reduceMotion)}
              exit="leave"
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              // So a closing row doesn't spill over the one below.
              className="overflow-hidden"
            >
              <EntryRow
                entry={entry}
                open={openRow === entry.id}
                onOpenChange={(open) => onOpenRow(entry.id, open)}
                onOpen={() => onOpen(entry)}
                // Swaps are recipe to recipe; a recipe entry is in
                // servings (even if the recipe was deleted since).
                onSwap={entry.unit === "serving" ? () => onSwap(entry) : undefined}
                onDelete={() => {
                  slidOff.current.add(entry.id);
                  onDelete(entry);
                }}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {entries.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          // Where focus goes after deleting this meal's last entry.
          data-add-meal={meal}
          className="focus-ring press-wide flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add to {label.toLowerCase()}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add to ${label.toLowerCase()}`}
            // Where focus goes after deleting one of this meal's entries.
            data-add-meal={meal}
            className="focus-ring press flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add
          </button>
        </>
      )}
    </section>
  );
}
