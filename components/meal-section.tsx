"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { dayTotals, totalNumber } from "@/lib/day-totals";
import { MEAL_LABELS, type Meal } from "@/lib/meals";
import type { MealEntry } from "@/lib/types";
import { EntryRow } from "./entry-row";

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

      {entries.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          // Where focus goes after deleting this meal's last entry.
          data-add-meal={meal}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add to {label.toLowerCase()}
        </button>
      ) : (
        <>
          <ul>
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  // Deleted: it fades and the rows below close up. With
                  // reduced motion, MotionConfig makes height jump too, so
                  // height: 0 would hide the row at once, fade and all:
                  // only the fade, then the rows below move up.
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
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
                    onDelete={() => onDelete(entry)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add to ${label.toLowerCase()}`}
            // Where focus goes after deleting one of this meal's entries.
            data-add-meal={meal}
            className="flex h-11 items-center gap-1.5 px-3 text-sm font-medium text-primary"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add
          </button>
        </>
      )}
    </section>
  );
}
