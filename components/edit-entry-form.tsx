"use client";

// Change the amount or meal of something you logged, or delete it.
// The preview scales the entry's own snapshot, exactly like the server
// will, so it matches what you'll see after saving.

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { keepOnFailure, tapAgain } from "@/lib/action-call";
import { updateEntry } from "@/lib/entry-actions";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { scaleSnapshot } from "@/lib/nutrition";
import type { FormState, MealEntry } from "@/lib/types";
import { AmountField } from "./amount-field";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";
import { SwapButton } from "./swap-button";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function EditEntryForm({
  entry,
  onDone,
  onSwap,
  onDelete,
}: {
  entry: MealEntry;
  onDone: () => void;
  /** Recipe entries only: "Tired of this?" opens the swap stack instead. */
  onSwap?: () => void;
  /**
   * Deletes it; Today closes the sheet and shows "… deleted · Undo".
   * Gives back why it didn't work (shown here), or null.
   */
  onDelete: () => Promise<string | null>;
}) {
  const [amount, setAmount] = useState(String(entry.amount));
  const [meal, setMeal] = useState<Meal>(entry.meal);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      // Offline: a message here, and your changes stay. (Delete goes
      // through Today, which already catches this itself.)
      const result = await keepOnFailure(updateEntry, tapAgain("save", "Save changes"))(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    { ok: false },
  );

  // One message line for two buttons, and only the newest problem shows.
  // The Save answer that was up when you tapped Delete is set aside here,
  // so an old Save error never hides a newer Delete error; and saving
  // again clears the old Delete error.
  const [hiddenSaveAnswer, setHiddenSaveAnswer] = useState<FormState | null>(null);

  function handleDelete() {
    setDeleteError(undefined);
    setHiddenSaveAnswer(state);
    startDelete(async () => {
      const problem = await onDelete();
      if (problem) {
        setDeleteError(problem);
        setConfirming(false);
      }
    });
  }

  // A failed delete swaps "Yes, delete" back for "Delete". The button
  // that had keyboard focus is gone then, so focus goes to Delete instead
  // of falling out to the page.
  const deleteRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (deleteError && document.activeElement === document.body) deleteRef.current?.focus();
  }, [deleteError]);

  // The entry's unit picks the rules: servings (at most 20) for a recipe.
  const parsed = validateEntryChange({ meal, amount, unit: entry.unit });
  const preview = parsed.ok ? scaleSnapshot(entry, entry.amount, parsed.value.amount) : null;
  const errors = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);
  const saveMessage = state === hiddenSaveAnswer ? undefined : (state.message ?? errors.meal);
  // Hidden while trying again: a second failure with the same words then
  // shows up (and is read out) again instead of looking like nothing
  // happened.
  const message = pending || deleting ? undefined : (deleteError ?? saveMessage);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setDeleteError(undefined)}
      className="space-y-5 pt-2"
      noValidate
    >
      <input type="hidden" name="id" value={entry.id} />
      <p className="text-lg font-medium">{entry.name}</p>

      <div className="space-y-2">
        <AmountField unit={entry.unit} value={amount} onChange={setAmount} error={errors.amount} />
        <AmountPreview values={preview} />
      </div>

      {/* For anyone who didn't spot the icon on the row. */}
      {onSwap && <SwapButton onClick={onSwap} />}

      <SegmentedControl
        name="meal"
        label="Meal"
        options={MEAL_OPTIONS}
        value={meal}
        onChange={setMeal}
      />

      {/* role="alert": read out as soon as it appears. */}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}

      {/* focusableWhenDisabled: while it works the button waits but keeps
          keyboard focus (plain disabled would drop it to the page). */}
      <Button
        type="submit"
        disabled={pending || deleting}
        focusableWhenDisabled
        className="h-11 w-full text-base"
      >
        {pending ? "Saving…" : "Save changes"}
      </Button>

      {confirming ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">Delete this entry?</span>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            focusableWhenDisabled
            className="h-11 px-4 text-base"
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirming(false)}
            className="h-11 text-base"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          ref={deleteRef}
          type="button"
          variant="ghost"
          onClick={() => setConfirming(true)}
          // Not while a save is still running: the two answers would race
          // for the one message line, and a save landing after a delete
          // would find the sheet gone (like Remove in ingredient-form).
          disabled={pending}
          focusableWhenDisabled
          className="h-11 w-full text-base text-destructive"
        >
          Delete
        </Button>
      )}
    </form>
  );
}
