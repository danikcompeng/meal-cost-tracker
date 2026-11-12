"use client";

// The interactive part of the Today screen. It holds one piece of state:
// which sheet is open (adding to a meal, or editing an entry), if any.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { dayTotals } from "@/lib/day-totals";
import { MEALS, MEAL_LABELS, type Meal } from "@/lib/meals";
import type { Targets } from "@/lib/targets";
import type { Food, MealEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./bottom-sheet";
import { DaySummary } from "./day-summary";
import { EditEntryForm } from "./edit-entry-form";
import { FoodPicker } from "./food-picker";
import { LogFoodForm } from "./log-food-form";
import { MealSection } from "./meal-section";

type Sheet =
  | { mode: "add"; meal: Meal; food: Food | null }
  | { mode: "edit"; entry: MealEntry }
  | null;

export function TodayView({
  day,
  isToday,
  entries,
  foods,
  targets,
  logFood,
  suggestedMeal,
}: {
  day: string;
  isToday: boolean;
  entries: MealEntry[];
  foods: Food[];
  targets: Targets;
  /** A food you just scanned: its "Log it" sheet opens straight away. */
  logFood: Food | null;
  /** The meal for the time of day, picked for that sheet. */
  suggestedMeal: Meal;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(() =>
    logFood ? { mode: "add", meal: suggestedMeal, food: logFood } : null,
  );

  function close() {
    setSheet(null);
    // Take "?log=" out of the address, so refreshing or going back to this
    // page doesn't open the sheet again.
    if (logFood) router.replace(isToday ? "/" : `/?day=${day}`, { scroll: false });
  }

  // First use: there's nothing to log until you've added a food.
  if (foods.length === 0 && entries.length === 0) {
    return (
      <section className="rounded-2xl bg-card px-5 py-10 text-center">
        <h2 className="text-lg font-semibold">Start with the foods you buy</h2>
        <p className="mx-auto mt-2 max-w-xs text-muted-foreground">
          Add a food or two, with what you paid and the macros from the label. Then log what you
          eat here.
        </p>
        <Link href="/foods" className={cn(buttonVariants(), "mt-6 h-11 px-6 text-base")}>
          Add your first food
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">
          or{" "}
          <Link href="/scan" className="font-medium text-primary">
            scan a barcode
          </Link>
        </p>
      </section>
    );
  }

  return (
    // reducedMotion="user": if your phone asks for less motion, Framer
    // Motion skips the slides and keeps only gentle fades.
    <MotionConfig reducedMotion="user">
      <DaySummary totals={dayTotals(entries)} isToday={isToday} targets={targets} />

      {entries.length === 0 && (
        <p className="mt-6 text-center text-muted-foreground">
          {isToday ? "Nothing logged yet today." : "Nothing logged this day."} Tap a meal to add
          what you ate.
        </p>
      )}

      <div className="mt-8 space-y-6">
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={entries.filter((e) => e.meal === meal)}
            onAdd={() => setSheet({ mode: "add", meal, food: null })}
            onOpen={(entry) => setSheet({ mode: "edit", entry })}
          />
        ))}
      </div>

      {sheet?.mode === "add" && (
        <BottomSheet title={`Add to ${MEAL_LABELS[sheet.meal].toLowerCase()}`} onClose={close}>
          {sheet.food ? (
            <LogFoodForm
              food={sheet.food}
              day={day}
              initialMeal={sheet.meal}
              onBack={() => setSheet({ ...sheet, food: null })}
              onDone={close}
            />
          ) : (
            <FoodPicker foods={foods} onPick={(food) => setSheet({ ...sheet, food })} />
          )}
        </BottomSheet>
      )}

      {sheet?.mode === "edit" && (
        <BottomSheet title="Edit entry" onClose={close}>
          <EditEntryForm entry={sheet.entry} onDone={close} />
        </BottomSheet>
      )}
    </MotionConfig>
  );
}
