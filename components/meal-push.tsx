"use client";

import { useLayoutEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { macroText } from "@/lib/macros";
import { DURATION, EASE_OUT, PUSH_FADE, PUSH_SCALE } from "@/lib/motion";
import type { MealEntry } from "@/lib/types";
import { amountText } from "@/lib/units";
import { untilSheetClosed } from "./bottom-sheet";

// What a Today row shows: name, amount · protein, and kcal on the right.
//
// After a swap the entry stays the same row, and the meal in it changes
// like a page being pushed: the old meal slides all the way out to the
// left while the new one comes in from the right, right behind it.
//
// How it stays one clean move: there's only ONE moving thing, a strip.
// The new meal sits in the strip as usual; the old one is glued to its
// left edge (right-full). The strip starts one row-width to the right, so
// the old meal is in view, and slides to 0. The two can't drift apart or
// overlap, because they're one element. (Two separate animations, one
// leaving and one arriving, ended up a frame apart, and at the fast start
// of the curve one frame opened a 40 px gap between them.) The row clips
// the strip at its edges. Only the strip's transform moves (cheap).
//
// It plays only when the meal itself changes (another recipe or food),
// not when you edit the servings.
//
// Like a carousel moving to the next item (phone check 2): the old meal
// also shrinks a little and fades as it goes, the new one grows in. Only
// sideways and scale, never up or down.
//
// Reduce Motion: no slide, no scale. The old meal crossfades into the new
// one in the same spot.
export function MealPush({ entry }: { entry: MealEntry }) {
  const reduceMotion = useReducedMotion();
  // Which recipe or food this is. null once that recipe or food has been
  // deleted (the entry keeps its copied name and numbers).
  const mealId = entry.recipe_id ?? entry.food_id;
  // The entry shown last time, and the meal leaving, if one is.
  // Following a prop by setting state while rendering is React's own
  // pattern for this ("storing information from previous renders"): the
  // old meal and the new one appear in the same frame, no flicker.
  const [shown, setShown] = useState({ mealId, entry });
  const [leaving, setLeaving] = useState<MealEntry | null>(null);
  // Only a real other recipe or food is a new meal. Deleting the food
  // turns its id to null: same meal on screen, no slide.
  if (mealId !== null && mealId !== shown.mealId) {
    setLeaving(shown.entry);
    setShown({ mealId, entry });
  } else if (entry !== shown.entry) {
    // Same meal, new numbers (servings edited) or its food just deleted:
    // keep the latest, so it's the one that leaves on the next swap.
    setShown({ mealId, entry });
  }

  // How far along: 1 = the old meal fully in view, 0 = the new one in
  // place (and where it rests). Everything below is worked out from this
  // one number, so the slide, the shrinking and the fading can't drift
  // apart:
  // - the strip's x is that share of its width;
  // - like a carousel, the old meal shrinks to PUSH_SCALE and fades to
  //   PUSH_FADE as it goes, and the new one grows from PUSH_SCALE. Scale
  //   is from each meal's centre, so nothing moves up or down.
  const progress = useMotionValue(0);
  const x = useTransform(progress, (p) => `${p * 100}%`);
  const newScale = useTransform(progress, (p) => 1 - (1 - PUSH_SCALE) * p);
  const oldScale = useTransform(progress, (p) => PUSH_SCALE + (1 - PUSH_SCALE) * p);
  const oldFade = useTransform(progress, (p) => PUSH_FADE + (1 - PUSH_FADE) * p);
  // Reduce Motion: a crossfade in place.
  const newOpacity = useTransform(progress, (p) => 1 - p);

  // A meal just left: start from 1 and run to 0, then drop the old meal.
  // A layout effect runs before the browser paints, so no frame shows the
  // new meal already in place before the slide starts. Started by hand
  // (animate), not by Framer's own reduced-motion setting, so it says
  // when it's done and is the same with Reduce Motion: a fade instead.
  useLayoutEffect(() => {
    if (leaving === null) return;
    let stopped = false;
    progress.jump(1);
    const controls = animate(progress, 0, {
      duration: reduceMotion ? DURATION.base : DURATION.slow,
      ease: EASE_OUT,
      // After a swap the sheet slides down first: the old meal waits in
      // place until it's gone, so the two moves don't overlap. Today says
      // "a sheet is closing" (noteSheetClosing) before the redraw, so this
      // knows even when the new meal and the closing land in one redraw.
      delay: untilSheetClosed() / 1000,
    });
    controls.then(() => {
      if (!stopped) setLeaving(null);
    });
    // Swapped again before it finished: this slide stops where it is and
    // the next one starts over with the meal that was arriving.
    return () => {
      stopped = true;
      controls.stop();
    };
  }, [leaving, progress, reduceMotion]);

  return (
    <span className="relative flex min-w-0 flex-1 overflow-hidden rounded-lg">
      <motion.span style={reduceMotion ? undefined : { x }} className="relative flex min-w-0 flex-1">
        <motion.span
          style={reduceMotion ? { opacity: newOpacity } : { scale: newScale }}
          className="flex min-w-0 flex-1"
        >
          <MealText entry={entry} />
        </motion.span>
        {leaving && (
          <motion.span
            aria-hidden="true"
            style={reduceMotion ? { opacity: progress } : { scale: oldScale, opacity: oldFade }}
            // Glued to the new meal's left edge; with Reduce Motion, right
            // on top of it, for the crossfade.
            className={`absolute inset-y-0 flex w-full ${reduceMotion ? "left-0" : "right-full"}`}
          >
            <MealText entry={leaving} />
          </motion.span>
        )}
      </motion.span>
    </span>
  );
}

function MealText({ entry }: { entry: MealEntry }) {
  return (
    <span className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{entry.name}</span>
        <span className="text-label text-muted-foreground tabular-nums">
          {amountText(entry.amount, entry.unit)} ·{" "}
          <span className={entry.protein_g === null ? undefined : "font-medium text-primary"}>
            {macroText(entry.protein_g, "g", "protein")}
          </span>
        </span>
      </span>
      <span
        className={
          entry.kcal === null ? "text-muted-foreground tabular-nums" : "whitespace-nowrap tabular-nums"
        }
      >
        {macroText(entry.kcal, "kcal")}
      </span>
    </span>
  );
}
