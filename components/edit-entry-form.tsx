"use client";

// Change the amount or meal of something you logged, or delete it.
// The preview scales the entry's own snapshot, exactly like the server
// will, so it matches what you'll see after saving.
//
// Save and Delete both hand over to Today, which closes the sheet and
// shows the change at once while the server saves it (today-view.tsx).
// A save that fails opens this sheet again with your changes (`draft`)
// and the reason; a delete that fails brings the row back with a message.

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { scaleSnapshot } from "@/lib/nutrition";
import type { Draft, Typed } from "@/lib/optimistic-entries";
import type { Serving } from "@/lib/servings";
import type { FormState, MealEntry } from "@/lib/types";
import { AmountField } from "./amount-field";
import { ErrorLine } from "./collapse";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";
import { ServingPicks } from "./serving-picks";
import { SwapButton } from "./swap-button";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function EditEntryForm({
  entry,
  serving,
  draft,
  onSave,
  onSwap,
  onDelete,
}: {
  entry: MealEntry;
  /**
   * The food's serving today ("1 bagel = 80 g"), for the quick picks; null
   * if it has none. Only a typing shortcut: the entry keeps its own grams
   * and numbers.
   */
  serving: Serving | null;
  /** A save that failed: your changes, and why they didn't save. */
  draft?: Draft;
  /** It passed the checks: Today saves it. */
  onSave: (typed: Typed) => void;
  /** Recipe entries only: "Tired of this?" opens the swap stack instead. */
  onSwap?: () => void;
  /** Today closes the sheet, the row slides away, "… deleted · Undo". */
  onDelete: () => void;
}) {
  const [amount, setAmount] = useState(draft?.amount ?? String(entry.amount));
  const [meal, setMeal] = useState<Meal>(draft?.meal ?? entry.meal);
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<FormState>(draft?.state ?? { ok: false });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const checked = validateEntryChange({ meal, amount, unit: entry.unit });
    if (!checked.ok) {
      setState({ ok: false, fieldErrors: checked.fieldErrors });
      return;
    }
    onSave({ text: amount, ...checked.value });
  }

  // The entry's unit picks the rules: servings (at most 20) for a recipe.
  const parsed = validateEntryChange({ meal, amount, unit: entry.unit });
  const preview = parsed.ok ? scaleSnapshot(entry, entry.amount, parsed.value.amount) : null;
  const errors = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);
  const message = state.message ?? errors.meal;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 pt-2" noValidate>
      {/* h3: under the sheet's own h2 title ("Edit entry"). */}
      <h3 className="text-lg font-medium">{entry.name}</h3>

      <div className="space-y-2">
        <AmountField unit={entry.unit} value={amount} onChange={setAmount} error={errors.amount} />
        {serving && (entry.unit === "g" || entry.unit === "ml") && (
          <ServingPicks serving={serving} unit={entry.unit} value={amount} onPick={setAmount} />
        )}
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

      {/* Read out as soon as it appears; opens its space smoothly. */}
      <ErrorLine show={Boolean(message)} gap="5">
        {message}
      </ErrorLine>

      <Button type="submit" className="press-wide h-11 w-full text-base">
        Save changes
      </Button>

      {confirming ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">Delete this entry?</span>
          <Button type="button" variant="destructive" onClick={onDelete} className="h-11 px-4 text-base">
            Yes, delete
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
          type="button"
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="press-wide h-11 w-full text-base text-destructive"
        >
          Delete
        </Button>
      )}
    </form>
  );
}
