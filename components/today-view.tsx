"use client";

// The interactive part of the Today screen. It holds which sheet is open
// (adding to a meal, editing an entry, or swapping one), if any, and the
// "Lunch is now Lentil dal · Undo" message after a swap.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { dayTotals } from "@/lib/day-totals";
import { deleteEntry, restoreEntry, swapEntry, undoSwap, type SwapResult } from "@/lib/entry-actions";
import { deletedMessage, swapNotUndoneMessage, swappedMessage } from "@/lib/entry-messages";
import {
  DELETE_FAILED,
  SWAP_FAILED,
  UNDO_FAILED,
  type DeletedEntry,
  type SwappedFrom,
} from "@/lib/entry-validation";
import { holdEntry, withHeld, type Held } from "@/lib/held-entries";
import { waterTotal } from "@/lib/hydration";
import { showsWater } from "@/lib/summary";
import { MEALS, MEAL_LABELS, type Meal } from "@/lib/meals";
import { swapCurrentFromEntry, type EatenRow, type RankedSwap } from "@/lib/swap";
import type { Targets } from "@/lib/targets";
import type { Food, MealEntry, Recipe } from "@/lib/types";
import { BottomSheet } from "./bottom-sheet";
import { DaySummary } from "./day-summary";
import { EditEntryForm } from "./edit-entry-form";
import { FirstUse } from "./first-use";
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
    showSwapUndo(entry, swap, previous, swappedMessage(entry.meal, swap.name, entry.amount));
    return true;
  }

  /** "Lunch is now Lentil dal · 1.5 servings   Undo". */
  function showSwapUndo(
    entry: MealEntry,
    swap: RankedSwap,
    previous: SwappedFrom,
    text: string,
    isError = false,
  ) {
    const id = showToast({
      text,
      isError,
      undo: () => undo(id, entry, swap, previous),
      focusAfter: () => focusSwapButton(entry.id),
    });
  }

  /** Focus back on a row's swap button (it's the same row after a swap). */
  function focusSwapButton(entryId: string) {
    document.querySelector<HTMLElement>(`[data-swap-entry="${entryId}"]`)?.focus();
  }

  /**
   * Was this message replaced by a newer one while its Undo was trying?
   * (× waits while Undo runs; a new message doesn't.) Then a failure has
   * to get a message of its own, or you'd think it worked.
   */
  const replaced = (id: number) => shownToast.current?.id !== id;

  /** Puts the old entry back. Gives back why it didn't work, or null. */
  async function undo(
    id: number,
    entry: MealEntry,
    swappedTo: RankedSwap,
    previous: SwappedFrom,
  ): Promise<UndoProblem | null> {
    let problem: UndoProblem | null = null;
    try {
      const result = await undoSwap(entry.id, swappedTo.id, previous);
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
      if (replaced(id)) {
        const text = swapNotUndoneMessage(previous.meal, swappedTo.name);
        // With its own Undo when trying again can help, so the newer
        // message taking its place doesn't leave you stuck.
        if (problem.final) {
          showToast({ text, isError: true, focusAfter: () => focusSwapButton(entry.id) });
        } else showSwapUndo(entry, swappedTo, previous, text, true);
      }
      return problem;
    }
    // Only this message: a newer swap's message stays.
    setToast((t) => (t?.id === id ? null : t));
    return null;
  }

  // ----- Deleting, with Undo -----
  // A deleted entry leaves the screen straight away (a row's Delete button
  // doesn't wait for the server), so it's kept in this list of hidden ids
  // until the server's own list catches up.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  // Each time the server sends the day again, forget hidden ids it no
  // longer has: they've done their job. So an entry that comes back later
  // (an Undo whose answer got lost on the way) shows again by itself.
  // Adjusting state while rendering, React's way to follow a prop.
  const [entriesSeen, setEntriesSeen] = useState(entries);
  if (entriesSeen !== entries) {
    setEntriesSeen(entries);
    setHidden((current) => new Set([...current].filter((id) => entries.some((e) => e.id === id))));
  }
  // Entries held on screen while the edit sheet deletes them, so they
  // slide away only once the sheet has closed (lib/held-entries.ts). A
  // held entry shows even if it's hidden or the server already dropped it.
  const [held, setHeld] = useState<readonly Held[]>([]);
  const visible = useMemo(() => {
    const heldIds = new Set(held.map((h) => h.entry.id));
    return withHeld(
      entries.filter((e) => !hidden.has(e.id) || heldIds.has(e.id)),
      held,
    );
  }, [entries, hidden, held]);
  function release(id: string) {
    setHeld((current) => current.filter((h) => h.entry.id !== id));
  }

  // Deleted entries that slide off to the left as they leave, red filling
  // in behind (EntryRow), before the gap closes (MealSection). Read at
  // the moment a row starts leaving, so a ref, not state: nothing on
  // screen depends on it until then.
  const slideOut = useRef(new Set<string>());
  const willSlide = useCallback((id: string) => slideOut.current.has(id), []);
  // The mark is taken off exactly where a row comes back: a delete that
  // failed, or Undo. Not by watching what's on screen: the edit sheet
  // deletes inside a React transition, whose changes ("hide it", "hold
  // it") only apply once the whole delete is done, so for one redraw the
  // row is on screen, not yet hidden, and already marked.

  function setHiddenFor(id: string, hide: boolean) {
    setHidden((current) => {
      const next = new Set(current);
      if (hide) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Focus that has to wait for the page to redraw (a CSS selector): the
  // row Undo brings back, or "+ Add" once the edit sheet has closed (the
  // sheet puts focus back on its opener, the deleted row, as it closes;
  // this runs after that).
  const focusLater = useRef<string | null>(null);
  useEffect(() => {
    const selector = focusLater.current;
    const element = selector && document.querySelector<HTMLElement>(selector);
    if (!element) return;
    focusLater.current = null;
    element.focus();
  });
  function focusWhenThere(selector: string) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.focus();
    else focusLater.current = selector;
  }
  const rowSelector = (entry: MealEntry) => `[data-entry-open="${entry.id}"]`;
  // That meal's "+ Add", or on the first-use screen (no foods, nothing
  // logged) its "Add your first food". Each screen has only one of them.
  const addSelector = (meal: Meal) => `[data-add-meal="${meal}"], [data-first-use]`;
  // After deleting: deleting your last entry with no foods left switches
  // to the first-use screen a moment later, which would remove "+ Add"
  // just after it got focus. So wait for "Add your first food" instead.
  const afterDeleteSelector = (meal: Meal) =>
    foods.length === 0 && entries.length === 1 ? "[data-first-use]" : addSelector(meal);

  /** Deletes on the server: the deleted copy (for Undo), or why not. */
  async function removeEntry(
    entry: MealEntry,
  ): Promise<
    | { ok: true; deleted: DeletedEntry }
    | { ok: false; message: string; gone?: boolean; reached: boolean }
  > {
    try {
      const result = await deleteEntry(entry.id);
      return result.ok ? result : { ...result, reached: true };
    } catch {
      // No signal: the answer never arrived.
      return { ok: false, message: DELETE_FAILED, reached: false };
    }
  }

  /**
   * It was already deleted (a delete whose answer never reached your
   * phone, or another phone): what you wanted has happened, so not an
   * error, just no Undo. The server's fresh list (deleteEntry sends it)
   * drops the row.
   */
  function showAlreadyDeleted(entry: MealEntry) {
    showToast({
      text: `${entry.name} was already deleted.`,
      focusAfter: () => focusWhenThere(addSelector(entry.meal)),
    });
  }

  // The entry swiped open to show its Delete button: one at a time, so
  // opening one shuts the other.
  const [openRow, setOpenRow] = useState<string | null>(null);
  function openOrShutRow(entryId: string, open: boolean) {
    // Shutting only shuts that row, never one opened since.
    setOpenRow((current) => (open ? entryId : current === entryId ? null : current));
  }
  // While one is open: a press anywhere outside it, a scroll, Escape, or
  // keyboard focus moving out of it shuts it. The press still does its
  // own job (opening another row's sheet, say). Presses inside the open
  // row are the row's: its Delete button, or a tap that shuts it.
  useEffect(() => {
    if (openRow === null) return;
    const shut = () => setOpenRow(null);
    const row = () => document.querySelector<HTMLElement>(`[data-entry-row="${openRow}"]`);
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && (row()?.contains(target) ?? false);
    function onPointerDown(e: PointerEvent) {
      if (!isInside(e.target)) shut();
    }
    function onFocusIn(e: FocusEvent) {
      if (!isInside(e.target)) shut();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Shutting hides the Delete button (inert); if it had focus, focus
      // would fall to the top of the page, so move it to the row first.
      if (isInside(document.activeElement)) {
        row()?.querySelector<HTMLElement>("[data-entry-open]")?.focus();
      }
      shut();
    }
    // Capture: before anything on the page can stop the press reaching us.
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("scroll", shut, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("scroll", shut);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openRow]);

  /** Delete tapped on an open row: gone at once; back with a message if the server says no. */
  async function rowDelete(entry: MealEntry) {
    setOpenRow(null);
    // Clicked with a mouse or keyboard (a tap on iPhone never focuses a
    // button)? The button is going, so focus moves on to the meal's
    // "+ Add" instead of falling to the top of the page.
    if (document.activeElement?.matches("[data-row-delete]")) {
      focusLater.current = afterDeleteSelector(entry.meal);
    }
    slideOut.current.add(entry.id);
    setHiddenFor(entry.id, true);
    const result = await removeEntry(entry);
    if (!result.ok) {
      if (result.gone) {
        showAlreadyDeleted(entry);
        return;
      }
      slideOut.current.delete(entry.id);
      setHiddenFor(entry.id, false);
      showToast({
        text: result.message,
        isError: true,
        focusAfter: () => focusWhenThere(rowSelector(entry)),
      });
      // Same rule as a swap: reload only after a real answer from the
      // server, never with no signal.
      if (result.reached) router.refresh();
      return;
    }
    showDeleteUndo(entry, result.deleted, deletedMessage(entry.name, entry.meal));
  }

  /**
   * Delete in the edit sheet: the sheet waits ("Deleting…") and shows
   * the problem itself if it fails, like Save. Gives back that problem.
   */
  async function deleteFromSheet(mine: Sheet): Promise<string | null> {
    if (mine?.mode !== "edit") return null;
    const { entry } = mine;
    // Pressed with a keyboard (or VoiceOver)? Then focus moves on to the
    // meal's "+ Add" afterwards. A plain tap on iPhone never focuses a
    // button, and focus moved by code after a tap draws Safari's ring.
    const pressedWithFocus = document.activeElement?.matches("dialog button") ?? false;
    // Hidden before the server answers, like a swipe: its fresh list may
    // arrive first, and hiding it after that would keep an entry that
    // comes back later hidden. But held on screen meanwhile, so it can
    // slide away where you see it, once the sheet has closed.
    setHeld((current) => [...current, holdEntry(visible, entry)]);
    setHiddenFor(entry.id, true);
    const result = await removeEntry(entry);
    if (!result.ok && !result.gone) {
      setHiddenFor(entry.id, false);
      release(entry.id);
      if (result.reached) router.refresh();
      // The sheet was closed meanwhile: say it where you can see it.
      if (openSheet.current !== mine) {
        showToast({
          text: result.message,
          isError: true,
          focusAfter: () => focusWhenThere(rowSelector(entry)),
        });
      }
      return result.message;
    }
    // Deleted now, or already: either way the sheet's job is done.
    if (pressedWithFocus) focusLater.current = afterDeleteSelector(entry.meal);
    // The sheet closes and, in the same redraw, the row is let go: it
    // slides off to the left like a swiped row's Delete.
    finish(mine);
    slideOut.current.add(entry.id);
    release(entry.id);
    if (result.ok) showDeleteUndo(entry, result.deleted, deletedMessage(entry.name, entry.meal));
    else showAlreadyDeleted(entry);
    return null;
  }

  /** "Rolled oats deleted from Breakfast   Undo". */
  function showDeleteUndo(entry: MealEntry, deleted: DeletedEntry, text: string, isError = false) {
    let restored = false;
    const id = showToast({
      text,
      isError,
      undo: async () => {
        const problem = await restore(id, entry, deleted);
        restored = problem === null;
        return problem;
      },
      // Undo worked: the row, once it's back. Dismissed: its meal's "+ Add".
      focusAfter: () =>
        restored ? focusWhenThere(rowSelector(entry)) : focusWhenThere(addSelector(entry.meal)),
    });
  }

  /** Puts a deleted entry back. Gives back why it didn't work, or null. */
  async function restore(id: number, entry: MealEntry, deleted: DeletedEntry): Promise<UndoProblem | null> {
    let problem: UndoProblem | null = null;
    try {
      const result = await restoreEntry(deleted);
      if (!result.ok) {
        const message = result.message ?? UNDO_FAILED;
        // Only "couldn't" is worth another try; "that food was deleted"
        // will say the same again.
        problem = { message, final: message !== UNDO_FAILED };
      }
    } catch {
      problem = { message: UNDO_FAILED, final: false };
    }
    if (problem) {
      if (replaced(id)) {
        const text = `Couldn't undo: ${entry.name} is still deleted.`;
        // With its own Undo when trying again can help (see undo above).
        if (problem.final) {
          showToast({
            text,
            isError: true,
            focusAfter: () => focusWhenThere(addSelector(entry.meal)),
          });
        } else showDeleteUndo(entry, deleted, text, true);
      }
      return problem;
    }
    // Back: a normal row again (it slides only if deleted again).
    slideOut.current.delete(entry.id);
    setHiddenFor(entry.id, false);
    // Only this message: a newer one stays.
    setToast((t) => (t?.id === id ? null : t));
    return null;
  }

  const water = waterTotal(visible);

  // First use: there's nothing to log until you've added a food.
  const firstUse = foods.length === 0 && entries.length === 0;

  return (
    <>
      {firstUse ? <FirstUse /> : dayContent()}
      {/* The message stays until dismissed, and it sits over the bottom of
          the page (undo-toast.tsx), so while it's up the page gets this
          much more room: the last thing on the page (snack's "+ Add", or
          "scan a barcode" on first use) can always scroll above it, even
          with 4 lines of message on a small phone. */}
      {toast && <div aria-hidden="true" className="h-20" />}
      {/* One message in one place for both screens: deleting your last
          entry with no foods left switches to the first-use screen, and
          the same message (with its Undo) has to stay up, not be rebuilt. */}
      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );

  // The day itself: summary, meals and their sheets. Called as a plain
  // function, not drawn as <Day />: a component defined inside TodayView
  // would be a new kind of component on every redraw, and React would
  // rebuild the whole day each time (losing open rows and animations).
  function dayContent() {
    return (
      <>
      {/* Everything below counts what's on screen: a row you just deleted
          leaves the totals as it leaves the list. */}
      <DaySummary
        totals={dayTotals(visible)}
        water={water}
        isToday={isToday}
        targets={targets}
        showWater={showsWater(targets)}
        initialOpen={detailsOpen}
      />

      {visible.length === 0 && (
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
            entries={visible.filter((e) => e.meal === meal)}
            onAdd={() => setSheet({ mode: "add", meal, food: null, recipe: null })}
            onOpen={(entry) => setSheet({ mode: "edit", entry })}
            onSwap={openSwap}
            openRow={openRow}
            onOpenRow={openOrShutRow}
            onDelete={(entry) => void rowDelete(entry)}
            willSlide={willSlide}
          />
        ))}
      </div>

      {/* Each sheet in an AnimatePresence, which keeps it on the page
          while it slides down (bottom-sheet.tsx). */}
      <AnimatePresence>
      {sheet?.mode === "add" && (
        <BottomSheet
          key="add"
          title={`Add to ${MEAL_LABELS[sheet.meal].toLowerCase()}`}
          onClose={close}
          // The list, a recipe's servings or a food's amount: switching
          // between them glides the sheet's height.
          step={sheet.recipe ? `recipe:${sheet.recipe.id}` : sheet.food ? `food:${sheet.food.id}` : "pick"}
        >
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
      </AnimatePresence>

      <AnimatePresence>
      {sheet?.mode === "edit" && (
        <BottomSheet key="edit" title="Edit entry" onClose={close}>
          <EditEntryForm
            entry={sheet.entry}
            onDone={close}
            onSwap={sheet.entry.unit === "serving" ? () => openSwap(sheet.entry) : undefined}
            onDelete={() => deleteFromSheet(sheet)}
          />
        </BottomSheet>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {sheet?.mode === "swap" && swapCurrent && (
        <SwapSheet
          key="swap"
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
      </AnimatePresence>
      </>
    );
  }
}
