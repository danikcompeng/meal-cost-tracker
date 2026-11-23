"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Plus } from "lucide-react";
import { dayTotals, totalNumber } from "@/lib/day-totals";
import { MEAL_LABELS, type Meal } from "@/lib/meals";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { MealEntry } from "@/lib/types";
import { untilSheetClosed } from "./bottom-sheet";
import { EntryRow } from "./entry-row";

/**
 * How a deleted row leaves: the space it took closes up, so the rows below
 * move up.
 * - Deleted with Delete (the row's red one, or the edit sheet's once the
 *   sheet has slid away; `willSlide`): it slides off to the left as it
 *   leaves, red filling in behind (EntryRow), so the gap waits for the
 *   sheet (untilSheetClosed) and DURATION.slow for that slide, then the
 *   red closes up.
 * - Anything else (gone from the server's list, another phone): it fades
 *   and closes at once.
 * - Reduce Motion: MotionProvider makes height jump, so height: 0 would
 *   hide the row at once, fade and all: only the fade, then the rows
 *   below jump up.
 */
function leaveVariants(id: string, reduceMotion: boolean | null): Variants {
  return {
    leave: (willSlide: ((id: string) => boolean) | undefined) => {
      if (reduceMotion) return { opacity: 0 };
      // A sliding row first waits for a sheet still sliding down (the edit
      // sheet's Delete), then for its own slide, then closes up.
      const delay = willSlide?.(id) ? untilSheetClosed() / 1000 + DURATION.slow : 0;
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
  willSlide,
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
  /** Does this deleted entry slide off as it leaves? (Today keeps the list.) */
  willSlide: (id: string) => boolean;
}) {
  const reduceMotion = useReducedMotion();
  const label = MEAL_LABELS[meal];
  const kcal = dayTotals(entries).kcal;
  const headingId = `meal-${meal}`;

  return (
    // A grey tile, like every section. p-2: the rows' 10 px corners sit
    // 8 px in from the tile's 18 px ones (concentric, CLAUDE.md).
    <section aria-labelledby={headingId} className="rounded-2xl bg-card p-2">
      <div className="mt-1 mb-1 flex items-baseline justify-between px-3">
        <h2 id={headingId} className="font-medium">
          {label}
        </h2>
        {entries.length > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {totalNumber(kcal, "kcal")} kcal
            {kcal.missing > 0 && kcal.sum !== null && ` · ${kcal.missing} unknown`}
          </span>
        )}
      </div>

      {/* Always on the page, even with no entries: the last one deleted
          still has to slide off and close up inside it. */}
      <ul>
        {/* custom: asks whether a row slides off, at the moment it starts
            leaving (Today has noted it by then). The leaving row reads the
            same question itself (usePresenceData in EntryRow). */}
        <AnimatePresence initial={false} custom={willSlide}>
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
                onDelete={() => onDelete(entry)}
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
