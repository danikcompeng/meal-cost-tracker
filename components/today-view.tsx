"use client";

// The interactive part of the Today screen. It holds one piece of state:
// which sheet is open (adding to a meal, or editing an entry), if any.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { dayTotals } from "@/lib/day-totals";
import { waterTotal } from "@/lib/hydration";
import { showsWater } from "@/lib/summary";
import { MEALS, MEAL_LABELS, type Meal } from "@/lib/meals";
import type { Targets } from "@/lib/targets";
import type { Food, MealEntry, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./bottom-sheet";
import { DaySummary } from "./day-summary";
import { EditEntryForm } from "./edit-entry-form";
import { FoodPicker } from "./food-picker";
import { LogFoodForm } from "./log-food-form";
import { LogRecipeForm } from "./log-recipe-form";
import { MealSection } from "./meal-section";

// Adding: first the list (food and recipe both null), then the amount
// for whichever you picked.
type Sheet =
  | { mode: "add"; meal: Meal; food: Food | null; recipe: Recipe | null }
  | { mode: "edit"; entry: MealEntry }
  | null;

export function TodayView({
  day,
  isToday,
  entries,
  foods,
  recipes,
  targets,
  logFood,
  suggestedMeal,
  detailsOpen,
}: {
  day: string;
  isToday: boolean;
  entries: MealEntry[];
  foods: Food[];
  /** Recipes you can log (ones with ingredients), recently eaten first. */
  recipes: Recipe[];
  targets: Targets;
  /** The summary's "Show details" was left open on this device. */
  detailsOpen: boolean;
  /** A food you just scanned: its "Log it" sheet opens straight away. */
  logFood: Food | null;
  /** The meal for the time of day, picked for that sheet. */
  suggestedMeal: Meal;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(() =>
    logFood ? { mode: "add", meal: suggestedMeal, food: logFood, recipe: null } : null,
  );

  function close() {
    setSheet(null);
    // Take "?log=" out of the address, so refreshing or going back to this
    // page doesn't open the sheet again.
    if (logFood) router.replace(isToday ? "/" : `/?day=${day}`, { scroll: false });
  }

  /**
   * After logging: close the sheet the form belongs to, and only that one.
   * A slow save can finish after you closed it and opened another (say,
   * "+ Add to dinner"); that one must stay open. A sheet keeps the same
   * object until it's replaced, so comparing objects tells them apart.
   */
  function finish(mine: Sheet) {
    setSheet((current) => (current === mine ? null : current));
    if (logFood) router.replace(isToday ? "/" : `/?day=${day}`, { scroll: false });
  }

  const water = waterTotal(entries);

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
      <DaySummary
        totals={dayTotals(entries)}
        water={water}
        isToday={isToday}
        targets={targets}
        showWater={showsWater(targets)}
        initialOpen={detailsOpen}
      />

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
            onAdd={() => setSheet({ mode: "add", meal, food: null, recipe: null })}
            onOpen={(entry) => setSheet({ mode: "edit", entry })}
          />
        ))}
      </div>

      {sheet?.mode === "add" && (
        <BottomSheet title={`Add to ${MEAL_LABELS[sheet.meal].toLowerCase()}`} onClose={close}>
          {sheet.recipe ? (
            <LogRecipeForm
              recipe={sheet.recipe}
              day={day}
              initialMeal={sheet.meal}
              onBack={() => setSheet({ ...sheet, recipe: null })}
              onDone={() => finish(sheet)}
            />
          ) : sheet.food ? (
            <LogFoodForm
              food={sheet.food}
              day={day}
              initialMeal={sheet.meal}
              backLabel={recipes.length > 0 ? "Recipes and foods" : "All foods"}
              onBack={() => setSheet({ ...sheet, food: null })}
              onDone={() => finish(sheet)}
            />
          ) : (
            <FoodPicker
              foods={foods}
              onPick={(food) => setSheet({ ...sheet, food })}
              recipes={recipes}
              onPickRecipe={(recipe) => setSheet({ ...sheet, recipe })}
            />
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
