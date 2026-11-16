"use client";

// The interactive part of the Today screen. It holds which sheet is open
// (adding to a meal, editing an entry, or swapping one), if any, and the
// "Lunch is now Lentil dal · Undo" message after a swap.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { dayTotals } from "@/lib/day-totals";
import { swapEntry, undoSwap, type SwapResult } from "@/lib/entry-actions";
import { SWAP_FAILED, UNDO_FAILED, type SwappedFrom } from "@/lib/entry-validation";
import { waterTotal } from "@/lib/hydration";
import { showsWater } from "@/lib/summary";
import { MEALS, MEAL_LABELS, type Meal } from "@/lib/meals";
import { swapCurrentFromEntry, type EatenRow, type RankedSwap } from "@/lib/swap";
import type { Targets } from "@/lib/targets";
import type { Food, MealEntry, Recipe } from "@/lib/types";
import { amountText } from "@/lib/units";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./bottom-sheet";
import { DaySummary } from "./day-summary";
import { EditEntryForm } from "./edit-entry-form";
import { FoodPicker } from "./food-picker";
import { LogFoodForm } from "./log-food-form";
import { LogRecipeForm } from "./log-recipe-form";
import { MealSection } from "./meal-section";
import { SwapSheet } from "./swap-sheet";
import { UndoToast, type Toast, type UndoProblem } from "./undo-toast";

// Adding: first the list (food and recipe both null), then the amount
// for whichever you picked.
type Sheet =
  | { mode: "add"; meal: Meal; food: Food | null; recipe: Recipe | null }
  | { mode: "edit"; entry: MealEntry }
  | SwapSheetState
  | null;
type SwapSheetState = { mode: "swap"; entry: MealEntry };

export function TodayView({
  day,
  today,
  isToday,
  entries,
  foods,
  recipes,
  swapRecipes,
  history,
  targets,
  logFood,
  suggestedMeal,
  detailsOpen,
}: {
  day: string;
  /** Today's date, for "Haven't had it in 5 days" (even on a past day). */
  today: string;
  isToday: boolean;
  entries: MealEntry[];
  foods: Food[];
  /** Recipes you can log (ones with ingredients), recently eaten first. */
  recipes: Recipe[];
  /** All your recipes, for "Tired of this?" (it tells "none" from "empty"). */
  swapRecipes: Recipe[];
  /** What you ate lately, for the swap; null if it didn't load. */
  history: EatenRow[] | null;
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

  // ----- "Tired of this?" -----
  // A swap under way, or the reason the last one failed, belongs to the
  // sheet it started in (the same object until that sheet is replaced).
  // Close the sheet mid-swap and open another, and the new one doesn't
  // show "Swapping…" or the old one's error.
  const [swapStatus, setSwapStatus] = useState<{
    sheet: SwapSheetState;
    pending: boolean;
    error: string | null;
  } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastCount = useRef(0);
  // Which sheet and message are on screen right now, for code that
  // finishes later.
  const openSheet = useRef(sheet);
  const shownToast = useRef(toast);
  useEffect(() => {
    openSheet.current = sheet;
    shownToast.current = toast;
  });

  const status = sheet?.mode === "swap" && swapStatus?.sheet === sheet ? swapStatus : null;

  function openSwap(entry: MealEntry) {
    setSheet({ mode: "swap", entry });
  }

  // The meal you're tired of, per serving, from the entry's own snapshot.
  // The same object while the sheet is open, so the stack ranks once.
  const swapFrom = sheet?.mode === "swap" ? sheet.entry : null;
  const swapCurrent = useMemo(() => swapFrom && swapCurrentFromEntry(swapFrom), [swapFrom]);

  function showToast(toast: Omit<Toast, "id">): number {
    const id = ++toastCount.current;
    setToast({ ...toast, id });
    return id;
  }

  /**
   * Swaps the entry on the server. Gives back "did it work?", so the card
   * comes back when it didn't. Closing the sheet meanwhile doesn't stop it
   * (the request has already gone), so the result still shows, in the
   * message above the tab bar.
   */
  async function pickSwap(mine: SwapSheetState, swap: RankedSwap): Promise<boolean> {
    const { entry } = mine;
    setSwapStatus({ sheet: mine, pending: true, error: null });

    let result: SwapResult;
    let reached = true;
    try {
      result = await swapEntry(entry.id, swap.id);
    } catch {
      // No signal: the answer never arrived.
      reached = false;
      result = { ok: false, message: SWAP_FAILED };
    }

    if (!result.ok) {
      const message = result.message;
      setSwapStatus((s) => (s?.sheet === mine ? { ...s, pending: false, error: message } : s));
      // The server said no ("It changed just now", "already that recipe"):
      // the day on screen is out of date, so reload it. Never with no
      // signal: a refresh that can't reach the server makes Next.js load
      // the whole page from scratch, which offline means the phone's "No
      // internet" page. (A swap that saved but lost its reply is caught on
      // the next try: the server answers "It's already that recipe.")
      if (reached) router.refresh();
      // The sheet was closed meanwhile: say it where you can see it.
      if (openSheet.current !== mine) {
        showToast({ text: message, isError: true, focusAfter: () => focusSwapButton(entry.id) });
      }
      return false;
    }

    const previous = result.previous;
    // Only this sheet's status: another sheet may have a swap of its own.
    setSwapStatus((s) => (s?.sheet === mine ? null : s));
    setSheet((current) => (current === mine ? null : current));
    const id = showToast({
      text: `${MEAL_LABELS[entry.meal]} is now ${swap.name} · ${amountText(entry.amount, "serving")}`,
      undo: () => undo(id, entry.id, swap, previous),
      focusAfter: () => focusSwapButton(entry.id),
    });
    return true;
  }

  /** Focus back on a row's swap button (it's the same row after a swap). */
  function focusSwapButton(entryId: string) {
    document.querySelector<HTMLElement>(`[data-swap-entry="${entryId}"]`)?.focus();
  }

  /**
   * Undo didn't work, but its message was replaced by a newer one while
   * it was trying (× waits while Undo runs, a new message doesn't): say
   * so in a message of its own, or you'd think it worked.
   */
  function reportLostUndo(id: number, text: string, focusAfter: () => void) {
    if (shownToast.current?.id !== id) showToast({ text, isError: true, focusAfter });
  }

  /** Puts the old entry back. Gives back why it didn't work, or null. */
  async function undo(
    id: number,
    entryId: string,
    swappedTo: RankedSwap,
    previous: SwappedFrom,
  ): Promise<UndoProblem | null> {
    let problem: UndoProblem | null = null;
    try {
      const result = await undoSwap(entryId, swappedTo.id, previous);
      if (!result.ok) {
        const message = result.message ?? UNDO_FAILED;
        // Only "couldn't" is worth another try; "it's changed since" and
        // "doesn't exist anymore" will say the same again.
        problem = { message, final: message !== UNDO_FAILED };
      }
    } catch {
      problem = { message: UNDO_FAILED, final: false };
    }
    if (problem) {
      // Not "please try again": that message has no Undo of its own.
      reportLostUndo(
        id,
        `Couldn't undo: ${MEAL_LABELS[previous.meal]} is still ${swappedTo.name}.`,
        () => focusSwapButton(entryId),
      );
      return problem;
    }
    // Only this message: a newer swap's message stays.
    setToast((t) => (t?.id === id ? null : t));
    return null;
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
            onSwap={openSwap}
          />
        ))}
      </div>
      {/* The message stays until dismissed, and it sits over the bottom of
          the page (undo-toast.tsx), so while it's up the page gets this
          much more room: the last row (snack's "+ Add") can always scroll
          above it, even with 4 lines of message on a small phone. */}
      {toast && <div aria-hidden="true" className="h-20" />}

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
          <EditEntryForm
            entry={sheet.entry}
            onDone={close}
            onSwap={sheet.entry.unit === "serving" ? () => openSwap(sheet.entry) : undefined}
          />
        </BottomSheet>
      )}

      {sheet?.mode === "swap" && swapCurrent && (
        <SwapSheet
          current={swapCurrent}
          recipes={swapRecipes}
          history={history}
          today={today}
          // Servings stay the same: 1.5 of oats becomes 1.5 of dal.
          servings={sheet.entry.amount}
          pickLabel="Swap to this"
          dragLabel="Swap"
          pendingLabel={status?.pending ? "Swapping…" : null}
          error={status?.error ?? null}
          // You moved to another card: the last card's error isn't about it.
          onMove={() =>
            setSwapStatus((s) => (s?.sheet === sheet && !s.pending && s.error ? { ...s, error: null } : s))
          }
          onPick={(swap) => pickSwap(sheet, swap)}
          onClose={close}
        />
      )}

      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
    </MotionConfig>
  );
}
