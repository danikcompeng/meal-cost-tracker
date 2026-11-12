"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { missingNote, type DayTotals } from "@/lib/day-totals";
import { costLine, DETAILS_COOKIE, summarySlots } from "@/lib/summary";
import { hasAnyTarget, progress, type Targets } from "@/lib/targets";
import { SummaryDetails } from "./summary-details";
import { SummaryRings } from "./summary-rings";

// The summary tile. Folded, it's fewer numbers at a glance: the big
// calories ring (the ONE big number on this screen), small rings for
// protein, carbs, fat and water with one number each, and the cost.
// "Show details" unfolds the exact "62 of 140 g" amounts, the "+ N
// unknown" notes and sugar, fiber, sat fat and sodium.
//
// Past days get no rings: targets aren't stored per day yet, so an old day
// would be judged against a target you set later.

export function DaySummary({
  totals,
  water,
  isToday,
  targets,
  showWater,
  initialOpen,
}: {
  totals: DayTotals;
  /** ml of water logged that day. */
  water: number;
  isToday: boolean;
  targets: Targets;
  showWater: boolean;
  /** From the cookie, so the server already draws it open or closed. */
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const reduceMotion = useReducedMotion();

  const kcal = isToday ? progress(totals.kcal, targets.daily_kcal) : null;
  const slots = summarySlots(totals, water, targets, isToday, showWater);
  const costNote = missingNote(totals.cost.missing, "a price");

  function toggle() {
    const next = !open;
    setOpen(next);
    // A cookie rather than localStorage: cookies are sent with every
    // request, so the server can draw the tile open or closed straight
    // away. localStorage is only readable in the browser, after the page
    // has loaded, so the details would jump open a moment later.
    document.cookie = `${DETAILS_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <section aria-labelledby="summary-label" className="rounded-2xl bg-card p-5">
      <h2 id="summary-label" className="text-[13px] font-medium text-muted-foreground">
        {kcal ? "Calories today" : isToday ? "Eaten today" : "Eaten this day"}
      </h2>

      {/* Tapping anywhere on the rings does the same as the button below:
          a bigger target for fingers. Keyboards and screen readers use the
          button, so this isn't a second thing to Tab to. */}
      <div onClick={toggle} className="cursor-pointer">
        <SummaryRings kcalTotal={totals.kcal} kcal={kcal} slots={slots} />
      </div>
      {totals.kcal.sum === null && (
        <p className="mt-2 text-center text-[13px] text-muted-foreground">
          None of these foods have calories yet
        </p>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="summary-details"
        className="mx-auto mt-3 flex h-11 items-center gap-1 px-3 text-[13px] font-medium text-muted-foreground"
      >
        {open ? "Hide details" : "Show details"}
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="inline-flex"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      {/* Height can't be skipped by Framer Motion's reduced-motion setting
          (it only skips movement like slides), so it's turned off here.
          initial={false}: if the cookie says open, it starts open with no
          animation. inert keeps the folded rows out of Tab and screen
          readers. */}
      <motion.div
        id="summary-details"
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        className="overflow-hidden"
        inert={!open}
      >
        <div className="pt-2 pb-4">
          <SummaryDetails totals={totals} kcal={kcal} slots={slots} />
        </div>
      </motion.div>

      <p className="text-center text-[13px] text-muted-foreground tabular-nums">
        {costLine(totals.cost, isToday)}
        {open && totals.cost.sum !== null && costNote && (
          <span className="block">{costNote}</span>
        )}
      </p>

      {!hasAnyTarget(targets) && (
        <Link
          href="/settings"
          className="-mb-2 flex h-11 items-center justify-center font-medium text-primary hover:underline"
        >
          Set daily targets
        </Link>
      )}
    </section>
  );
}
