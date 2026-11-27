"use client";

// The interactive part of the Today screen. It holds which sheet is open
// (adding to a meal, editing an entry, or swapping one), if any, and the
// "Lunch is now Lentil dal · Undo" message after a swap.
//
// Every save shows on Today the moment you tap: logging, editing,
// deleting, swapping and both Undos (React's useOptimistic). The sheet
// closes, the row changes and the rings move straight away while the
// server saves. Under 400 ms feels instant; a phone's trip to the server
// is often a second. The phone works the numbers out with the same pure
// functions the server uses (lib/optimistic-entries.ts), so when the
// server's own copy arrives nothing moves. If the server says no, the
// change goes back by itself and you're told why: a log or edit opens its
// sheet again with what you typed, everything else says so in the
// message above the tab bar.

import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { keepOnFailure, refreshIfReachable, tapAgain } from "@/lib/action-call";
import { dayTotals } from "@/lib/day-totals";
import {
  deleteEntry,
  // Renamed: `logFood` here is the food you just scanned (a prop).
  logFood as logFoodAction,
  logRecipe,
  restoreEntry,
  swapEntry,
  undoSwap,
  updateEntry,
  type SwapResult,
} from "@/lib/entry-actions";
import { deletedMessage, swapNotUndoneMessage, swappedMessage } from "@/lib/entry-messages";
import {
  DELETE_FAILED,
  SWAP_FAILED,
  UNDO_FAILED,
  swappedFrom,
  type DeletedEntry,
  type SwappedFrom,
} from "@/lib/entry-validation";
import { holdEntry, type Held } from "@/lib/held-entries";
import { waterTotal } from "@/lib/hydration";
import {
  applyEntryChange,
  editedFields,
  loggedFood,
  loggedRecipe,
  swappedFields,
  unswappedFields,
  type Draft,
  type EntryChange,
  type Typed,
} from "@/lib/optimistic-entries";
import { servingForEntry } from "@/lib/servings";
import { showsWater } from "@/lib/summary";
import { MEALS, MEAL_LABELS, type Meal } from "@/lib/meals";
import { swapCurrentFromEntry, type EatenRow, type RankedSwap } from "@/lib/swap";
import type { Targets } from "@/lib/targets";
import type { Food, FormState, MealEntry, Recipe } from "@/lib/types";
import { BottomSheet, noteSheetClosing, type SheetExit } from "./bottom-sheet";
import { DaySummary } from "./day-summary";
import { EditEntryForm } from "./edit-entry-form";
import { FirstUse } from "./first-use";
import { FoodPicker } from "./food-picker";
import { LogFoodForm } from "./log-food-form";
import { LogRecipeForm } from "./log-recipe-form";
import { MealSection } from "./meal-section";
import { PulseHush } from "./pulse";
import { SwapSheet } from "./swap-sheet";
import { UndoToast, type Toast, type UndoProblem } from "./undo-toast";

// Adding: first the list (food and recipe both null), then the amount
// for whichever you picked. `draft`: a log or edit that failed after its
// sheet closed, opened again with what you typed and why.
type Sheet = AddSheetState | EditSheetState | SwapSheetState | null;
type AddSheetState = { mode: "add"; meal: Meal; food: Food | null; recipe: Recipe | null; draft?: Draft };
type EditSheetState = { mode: "edit"; entry: MealEntry; draft?: Draft };
type SwapSheetState = { mode: "swap"; entry: MealEntry };

/**
 * How long a deleted row's "slide off" mark lasts. It's read once, when
 * the row starts leaving, which is within a few hundred ms of being set
 * (Delete hides the row at once). Generous, so a slow phone never misses it.
 */
const MARK_LIFETIME_MS = 3000;

/** How long the rings stay still after a save fails (see hushPulses). */
const HUSH_MS = 1000;

/** The amount and meal you typed, as the server reads them. */
function entryForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

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
    forgetScan();
  }

  /**
   * Takes "?log=" out of the address, so refreshing or going back to this
   * page doesn't open the scanned food's sheet again. The page is drawn
   * afresh then (the scanned food is part of its key, app/page.tsx), so
   * after "Log it" this waits until the save is done: drawn afresh
   * mid-save, the new entry would vanish until the server answered, and a
   * failure would have nowhere to show.
   */
  function forgetScan() {
    if (logFood) router.replace(isToday ? "/" : `/?day=${day}`, { scroll: false });
  }

  /**
   * Closes the sheet a save belongs to, and only that one: by the time
   * it's done you may have opened another (say, "+ Add to dinner"). A
   * sheet keeps the same object until it's replaced, so comparing objects
   * tells them apart.
   */
  function finish(mine: Sheet) {
    setSheet((current) => (current === mine ? null : current));
  }

  // ----- Saves shown before the server answers -----
  // The day as the server last sent it, with the saves still on their way
  // applied on top. React drops each change once its save has finished,
  // by which time the server's fresh day (sent with its answer) has it.
  const [shownEntries, showChange] = useOptimistic(entries, applyEntryChange);

  /**
   * Shows `change` now and runs `save` in the background (a React
   * transition: the change stays on screen exactly as long as `save`
   * runs). Gives back what `save` does, once it's done. `save` must not
   * throw: catch and answer instead.
   *
   * Plain state changes go BEFORE this call, never at the start of
   * `save`: inside a transition React holds them back until the whole
   * save is done. After its first await they apply at once again.
   */
  function saveInBackground<T>(change: EntryChange, save: () => Promise<T>): Promise<T> {
    return new Promise((resolve) => {
      startTransition(async () => {
        showChange(change);
        resolve(await save());
      });
    });
  }

  /**
   * A log or edit that failed after its sheet closed: open it again with
   * what you typed and why. If another sheet is open by now, don't take
   * it over: say why in the message instead.
   */
  function bringBack(again: AddSheetState | EditSheetState, name: string, verb: string) {
    if (openSheet.current === null) setSheet(again);
    else {
      const why = again.draft?.state.message ?? "Please try again.";
      showToast({ text: `Couldn't ${verb} ${name}. ${why}`, isError: true });
    }
  }

  // A save that failed goes back on screen, and the rings' numbers with
  // it. They mustn't pulse "done" for that, so for a moment after a
  // failure they stay still (PulseHush, pulse.tsx). Generous: the change
  // goes back within a frame or two of the failure.
  const hushUntil = useRef(0);
  function hushPulses() {
    hushUntil.current = performance.now() + HUSH_MS;
  }
  const pulseHushed = useCallback(() => performance.now() < hushUntil.current, []);

  // ----- "Tired of this?" -----
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
   * Swaps at once: the sheet closes, the row slides over to the new meal
   * and "Lunch is now … · Undo" shows, while the server saves it. If the
   * server says no, the row slides back and the message says why.
   * Gives back true: the card is done (the sheet is closing).
   */
  async function pickSwap(mine: SwapSheetState, swap: RankedSwap): Promise<boolean> {
    const { entry } = mine;
    const recipe = swapRecipes.find((r) => r.id === swap.id);
    // The stack only offers your recipes, so this can't really happen.
    if (!recipe) return false;
    // What Undo puts back, from the entry as it was.
    const previous = swappedFrom(entry);

    // The row's carousel waits for the sheet to slide down (meal-push.tsx):
    // said before the redraw, so the row knows even if it redraws first.
    if (openSheet.current === mine) noteSheetClosing();
    setSheet((current) => (current === mine ? null : current));

    // Did the swap save? Undo waits for this before it asks the server.
    const swapped = saveInBackground(
      { kind: "change", id: entry.id, fields: swappedFields(entry, recipe) },
      async () => {
        // swapEntry catches its own failures on the server; this catches
        // the phone's (no signal).
        let result: SwapResult;
        let reached = true;
        try {
          result = await swapEntry(entry.id, swap.id);
        } catch {
          // No signal: the answer never arrived.
          reached = false;
          result = { ok: false, message: SWAP_FAILED };
        }
        if (result.ok) return true;
        hushPulses();
        // The server said no ("It changed just now", "already that
        // recipe"): the day on screen is out of date, so reload it. Never
        // with no signal: a refresh that can't reach the server makes
        // Next.js load the whole page from scratch, which offline means
        // the phone's "No internet" page. (A swap that saved but lost its
        // reply is caught on the next try: the server answers "It's
        // already that recipe.")
        if (reached) router.refresh();
        // Takes the place of "Lunch is now …", whose Undo has nothing to undo.
        showToast({ text: result.message, isError: true, focusAfter: () => focusSwapButton(entry.id) });
        return false;
      },
    );
    // After the call above, not before: inside it React would hold this
    // message back until the swap had saved.
    showSwapUndo(entry, swap, previous, swappedMessage(entry.meal, swap.name, entry.amount), false, swapped);
    return true;
  }

  /**
   * Undo, at once: its message closes and the row goes back while the
   * server catches up. If keyboard focus was in the message, it goes to
   * `focusAfter` (the row is already there to take it). Gives back
   * whether it did, so a failed Undo can put focus somewhere useful again.
   */
  function closeForUndo(id: number, focusAfter: () => void): boolean {
    const hadFocus = document.activeElement?.closest('[role="status"]') != null;
    setToast((t) => (t?.id === id ? null : t));
    if (hadFocus) focusAfter();
    return hadFocus;
  }

  /**
   * "Lunch is now Lentil dal · 1.5 servings   Undo". `swapped`: the swap's
   * own save, while it may still be on its way.
   */
  function showSwapUndo(
    entry: MealEntry,
    swap: RankedSwap,
    previous: SwappedFrom,
    text: string,
    isError = false,
    swapped?: Promise<boolean>,
  ) {
    const id = showToast({
      text,
      isError,
      undo: () => undo(id, entry, swap, previous, swapped),
      focusAfter: () => focusSwapButton(entry.id),
    });
  }

  /** Focus back on a row's swap button (it's the same row after a swap). */
  function focusSwapButton(entryId: string) {
    document.querySelector<HTMLElement>(`[data-swap-entry="${entryId}"]`)?.focus();
  }

  /**
   * Is this message gone (closed by its own Undo, or replaced by a newer
   * one)? Then a failure has to get a message of its own, or you'd think
   * it worked.
   */
  const replaced = (id: number) => shownToast.current?.id !== id;

  /**
   * Puts the old entry back, at once (see closeForUndo). Gives back why
   * it didn't work, or null; then the row slides back to the swapped meal
   * and a new message says so.
   */
  async function undo(
    id: number,
    entry: MealEntry,
    swappedTo: RankedSwap,
    previous: SwappedFrom,
    swapped?: Promise<boolean>,
  ): Promise<UndoProblem | null> {
    const hadFocus = closeForUndo(id, () => focusSwapButton(entry.id));
    const change: EntryChange = { kind: "change", id: entry.id, fields: unswappedFields(previous) };
    const problem = await saveInBackground(change, async (): Promise<UndoProblem | null> => {
      // Tapped before the swap had saved: wait for it. If it never saved,
      // the meal is still the old one: nothing to undo (the swap's own
      // failure message is already showing).
      if (swapped && !(await swapped)) return null;
      try {
        const result = await undoSwap(entry.id, swappedTo.id, previous);
        if (result.ok) return null;
        const message = result.message ?? UNDO_FAILED;
        // Only "couldn't" is worth another try; "it's changed since" and
        // "doesn't exist anymore" will say the same again.
        return { message, final: message !== UNDO_FAILED };
      } catch {
        return { message: UNDO_FAILED, final: false };
      }
    });
    if (problem) {
      hushPulses();
      if (replaced(id)) {
        const text = swapNotUndoneMessage(previous.meal, swappedTo.name);
        // With its own Undo when trying again can help, so the newer
        // message taking its place doesn't leave you stuck.
        if (problem.final) {
          showToast({ text, isError: true, focusAfter: () => focusSwapButton(entry.id) });
        } else showSwapUndo(entry, swappedTo, previous, text, true);
      }
      // Focus had followed the row; it's still there (same row, old meal).
      if (hadFocus && document.activeElement === document.body) focusSwapButton(entry.id);
      return problem;
    }
    return null;
  }

  // ----- Deleting, with Undo -----
  // A deleted entry leaves the screen straight away (neither Delete waits
  // for the server), so it's kept in this list of hidden ids until the
  // server's own list catches up.
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
  // What's on screen: the day with the saves on their way, minus deletes.
  const visible = useMemo(() => shownEntries.filter((e) => !hidden.has(e.id)), [shownEntries, hidden]);

  // Deleted entries that slide off to the left as they leave, red filling
  // in behind (EntryRow), before the gap closes (MealSection). Read at
  // the moment a row starts leaving, so a ref, not state: nothing on
  // screen depends on it until then.
  const slideOut = useRef(new Set<string>());
  const willSlide = useCallback((id: string) => slideOut.current.has(id), []);
  // The mark is taken off where a row comes back (a delete that failed,
  // or Undo), and in any case a few seconds after it was set: by then the
  // row has started leaving, which is the only moment it's read. So a
  // row that comes back some other way (an Undo whose answer was lost)
  // can't slide off later when it's only moved to another meal.
  function markSlideOut(id: string) {
    slideOut.current.add(id);
    setTimeout(() => slideOut.current.delete(id), MARK_LIFETIME_MS);
  }

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

  /** Delete tapped on an open row. */
  function rowDelete(entry: MealEntry) {
    setOpenRow(null);
    // Clicked with a mouse or keyboard (a tap on iPhone never focuses a
    // button)? The button is going, so focus moves on to the meal's
    // "+ Add" instead of falling to the top of the page.
    void deleteNow(entry, document.activeElement?.matches("[data-row-delete]") ?? false);
  }

  /** "Yes, delete" in the edit sheet: the sheet closes, then the row slides off like a swiped one. */
  function deleteFromSheet(mine: EditSheetState) {
    // Pressed with a keyboard (or VoiceOver)? Then focus moves on to the
    // meal's "+ Add" afterwards. A plain tap on iPhone never focuses a
    // button, and focus moved by code after a tap draws Safari's ring.
    const pressedWithFocus = document.activeElement?.matches("dialog button") ?? false;
    // The row waits for the sheet to go before it slides (said first, so
    // the row's wait can't miss it).
    if (openSheet.current === mine) noteSheetClosing();
    finish(mine);
    void deleteNow(mine.entry, pressedWithFocus);
  }

  /**
   * Gone at once, sliding off to the left; back with a message if the
   * server says no. Hidden before the server answers: its fresh list may
   * arrive first, and hiding it after that would keep an entry that comes
   * back later hidden.
   */
  async function deleteNow(entry: MealEntry, moveFocus: boolean) {
    if (moveFocus) focusLater.current = afterDeleteSelector(entry.meal);
    // Where it was, so Undo puts it back in the same place.
    const spot = holdEntry(visible, entry);
    markSlideOut(entry.id);
    setHiddenFor(entry.id, true);
    const result = await removeEntry(entry);
    if (!result.ok) {
      if (result.gone) {
        showAlreadyDeleted(entry);
        return;
      }
      hushPulses();
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
    showDeleteUndo(entry, result.deleted, spot, deletedMessage(entry.name, entry.meal));
  }

  /** "Rolled oats deleted from Breakfast   Undo". */
  function showDeleteUndo(entry: MealEntry, deleted: DeletedEntry, spot: Held, text: string, isError = false) {
    const id = showToast({
      text,
      isError,
      undo: () => restore(id, entry, deleted, spot),
      // Dismissed: its meal's "+ Add". (Undo moves focus itself.)
      focusAfter: () => focusWhenThere(addSelector(entry.meal)),
    });
  }

  /**
   * Puts a deleted entry back, at once, where it was (see closeForUndo).
   * Gives back why it didn't work, or null; then it leaves again and a
   * new message says so.
   */
  async function restore(id: number, entry: MealEntry, deleted: DeletedEntry, spot: Held): Promise<UndoProblem | null> {
    const hadFocus = closeForUndo(id, () => focusWhenThere(rowSelector(entry)));
    // Back: a normal row again (it slides only if deleted again).
    slideOut.current.delete(entry.id);
    setHiddenFor(entry.id, false);
    const problem = await saveInBackground({ kind: "add", entry: deleted, spot }, async (): Promise<UndoProblem | null> => {
      try {
        const result = await restoreEntry(deleted);
        if (result.ok) return null;
        const message = result.message ?? UNDO_FAILED;
        // Only "couldn't" is worth another try; "that food was deleted"
        // will say the same again.
        return { message, final: message !== UNDO_FAILED };
      } catch {
        return { message: UNDO_FAILED, final: false };
      }
    });
    if (problem) {
      hushPulses();
      // Focus had followed the row back, and the row has gone again.
      if (hadFocus) focusWhenThere(addSelector(entry.meal));
      if (replaced(id)) {
        const text = `Couldn't undo: ${entry.name} is still deleted.`;
        // With its own Undo when trying again can help (see undo above).
        if (problem.final) {
          showToast({
            text,
            isError: true,
            focusAfter: () => focusWhenThere(addSelector(entry.meal)),
          });
        } else showDeleteUndo(entry, deleted, spot, text, true);
      }
      return problem;
    }
    return null;
  }

  // ----- Logging and editing -----

  /** "Log it": the sheet closes and the entry is on Today at once while it saves. */
  function logIt(mine: AddSheetState, typed: Typed) {
    const { food, recipe } = mine;
    // Made here, so the entry on screen and the one saved are the same row.
    // Trying again after a failure keeps it: if the first try did save
    // (the connection dropped after), the server says it's already there
    // instead of logging it twice.
    const id = mine.draft?.id ?? crypto.randomUUID();
    const entry = recipe
      ? loggedRecipe(id, day, typed.meal, recipe, typed.amount)
      : food && loggedFood(id, day, typed.meal, food, typed.amount);
    if (!entry) return;
    const form = entryForm({
      id,
      day,
      meal: typed.meal,
      amount: typed.text,
      ...(recipe ? { recipeId: recipe.id } : { foodId: food!.id }),
    });
    finish(mine);
    void saveInBackground({ kind: "add", entry }, async () => {
      // No signal: a message, and your amount comes back in the sheet. If
      // the connection dropped on the way it may have been logged anyway,
      // so Today reloads and the message says to check it.
      const result = await keepOnFailure(
        recipe ? logRecipe : logFoodAction,
        tapAgain("log it", "Log it", "Check Today"),
        () => void refreshIfReachable(() => router.refresh()),
      )({ ok: false }, form);
      if (result.ok) {
        forgetScan();
        return;
      }
      hushPulses();
      bringBack({ ...mine, draft: { ...draftOf(typed, result), id } }, entry.name, "log");
    });
  }

  /** "Save changes": the sheet closes and the row changes at once while it saves. */
  function saveEdit(mine: EditSheetState, typed: Typed) {
    const { entry } = mine;
    const form = entryForm({ id: entry.id, meal: typed.meal, amount: typed.text });
    finish(mine);
    const change: EntryChange = { kind: "change", id: entry.id, fields: editedFields(entry, typed.meal, typed.amount) };
    void saveInBackground(change, async () => {
      const result = await keepOnFailure(updateEntry, tapAgain("save", "Save changes"))({ ok: false }, form);
      if (result.ok) return;
      hushPulses();
      bringBack({ ...mine, draft: draftOf(typed, result) }, entry.name, "save");
    });
  }

  // Each draft is new, so its form is built afresh (it's the form's key)
  // and shows the reason. Without it, a failure that comes back while the
  // sheet is still sliding away would reopen that same sheet, whose form
  // keeps its old state and so never shows the message.
  const draftCount = useRef(0);
  function draftOf(typed: Typed, state: FormState): Draft {
    return { key: ++draftCount.current, amount: typed.text, meal: typed.meal, state };
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
      <PulseHush value={pulseHushed}>
        <DaySummary
          totals={dayTotals(visible)}
          water={water}
          isToday={isToday}
          targets={targets}
          showWater={showsWater(targets)}
          initialOpen={detailsOpen}
        />
      </PulseHush>

      {visible.length === 0 && (
        <p className="mt-6 text-center text-muted-foreground">
          {isToday ? "Nothing logged yet today." : "Nothing logged this day."} Tap a meal to add
          what you ate.
        </p>
      )}

      {/* Each meal is its own tile, spaced like the recipe tiles. */}
      <div className="mt-6 space-y-3">
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
              key={sheet.draft?.key ?? "new"}
              recipe={sheet.recipe}
              initialMeal={sheet.meal}
              draft={sheet.draft}
              onBack={() => setSheet({ ...sheet, recipe: null, draft: undefined })}
              onLog={(typed) => logIt(sheet, typed)}
            />
          ) : sheet.food ? (
            <LogFoodForm
              key={sheet.draft?.key ?? "new"}
              food={sheet.food}
              initialMeal={sheet.meal}
              draft={sheet.draft}
              backLabel={recipes.length > 0 ? "Recipes and foods" : "All foods"}
              onBack={() => setSheet({ ...sheet, food: null, draft: undefined })}
              onLog={(typed) => logIt(sheet, typed)}
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

      {/* The edit sheet grows out of the row you tapped and shrinks back
          into it, except when it makes way for the swap stack: then it
          slides down while the stack comes up (SheetExit). */}
      <AnimatePresence custom={(sheet?.mode === "swap" ? "slide" : "shrink") satisfies SheetExit}>
      {sheet?.mode === "edit" && (
        <BottomSheet
          key="edit"
          title="Edit entry"
          onClose={close}
          growFrom={`[data-entry-row="${sheet.entry.id}"]`}
        >
          <EditEntryForm
            key={sheet.draft?.key ?? "new"}
            entry={sheet.entry}
            serving={servingForEntry(sheet.entry, foods)}
            draft={sheet.draft}
            onSave={(typed) => saveEdit(sheet, typed)}
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
          onPick={(swap) => pickSwap(sheet, swap)}
          onClose={close}
        />
      )}
      </AnimatePresence>
      </>
    );
  }
}
