"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Shuffle } from "lucide-react";
import { macroText } from "@/lib/macros";
import type { MealEntry } from "@/lib/types";
import { amountText } from "@/lib/units";

// One thing you ate. Tap it to change the amount, move it or delete it.
//   Rolled oats                       568.5 kcal
//   150 g · 19.5 g protein
// A recipe gets a swap icon at the right edge ("Tired of this?").
//   Overnight oats                    750 kcal  ⇄
//   1.5 servings · 36 g protein
//
// That's two buttons side by side, not one inside the other: a button
// can't hold another button (screen readers and taps get confused).
export function EntryRow({
  entry,
  onOpen,
  onSwap,
}: {
  entry: MealEntry;
  onOpen: () => void;
  /** Only for recipe entries: opens the swap stack. */
  onSwap?: () => void;
}) {
  return (
    <div className="flex items-center rounded-lg transition-colors hover:bg-accent">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-2.5 text-left"
      >
        {/* After a swap the entry stays the same row, so its old name
            slides out and the new one slides in (a fade with reduced
            motion). The key changes only when the recipe does, so editing
            the servings doesn't play it. */}
        <span className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${entry.recipe_id ?? entry.food_id ?? ""}:${entry.name}`}
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex min-w-0 flex-col"
            >
              <span className="truncate font-medium">{entry.name}</span>
              <span className="text-[13px] text-muted-foreground tabular-nums">
                {amountText(entry.amount, entry.unit)} ·{" "}
                <span className={entry.protein_g === null ? undefined : "font-medium text-primary"}>
                  {macroText(entry.protein_g, "g", "protein")}
                </span>
              </span>
            </motion.span>
          </AnimatePresence>
        </span>
        <span
          className={
            entry.kcal === null
              ? "text-muted-foreground tabular-nums"
              : "whitespace-nowrap tabular-nums"
          }
        >
          {macroText(entry.kcal, "kcal")}
        </span>
      </button>
      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          aria-label={`Tired of ${entry.name}? Swap it`}
          // So focus can come back here after Undo (see TodayView).
          data-swap-entry={entry.id}
          className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Shuffle aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
