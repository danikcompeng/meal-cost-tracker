"use client";

// How much of a food goes into the recipe: adding a new ingredient, or
// changing (or removing) one that's already there. The preview line is
// for this amount in the whole recipe, with the same maths as logging it.

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { keepOnFailure, tapAgain } from "@/lib/action-call";
import { costOfAmount } from "@/lib/cost";
import { waterText } from "@/lib/hydration";
import { nutrientsForAmount } from "@/lib/nutrition";
import { removeIngredient, saveIngredient } from "@/lib/recipe-actions";
import { validateIngredient } from "@/lib/recipe-validation";
import type { Food, FormState } from "@/lib/types";
import { AmountField } from "./amount-field";
import { ErrorLine } from "./collapse";
import { AmountPreview } from "./amount-preview";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function IngredientForm({
  recipeId,
  food,
  currentAmount,
  onBack,
  onSaved,
}: {
  recipeId: string;
  food: Food;
  /** Set when the food is already in the recipe: change or remove it. */
  currentAmount?: number;
  /** Back to the food list (adding only). */
  onBack?: () => void;
  onSaved: () => void;
}) {
  const isNew = currentAmount === undefined;
  const [amount, setAmount] = useState(isNew ? "" : String(currentAmount));
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const [removing, startRemove] = useTransition();

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      // Offline: a message here, and the amount you typed stays.
      const result = await keepOnFailure(
        saveIngredient,
        // Each food is in a recipe once, so adding it twice can't happen.
        isNew ? tapAgain("add it", "Add") : tapAgain("save", "Save changes"),
      )(prev, formData);
      if (result.ok) onSaved();
      return result;
    },
    { ok: false },
  );

  // One message line for two buttons, and only the newest problem shows
  // (same as the Edit entry sheet): the Save answer that was up when you
  // tapped Remove is set aside, and saving again clears an old Remove
  // error.
  const [hiddenSaveAnswer, setHiddenSaveAnswer] = useState<FormState | null>(null);
  // A failed remove swaps "Yes, remove" back for "Remove": focus goes
  // there instead of falling out to the page.
  const removeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (removeError && document.activeElement === document.body) removeRef.current?.focus();
  }, [removeError]);

  function handleRemove() {
    setRemoveError(undefined);
    setHiddenSaveAnswer(state);
    startRemove(async () => {
      const result = await keepOnFailure(
        removeIngredient,
        { verb: "remove it", retry: "remove it again" },
      )(recipeId, food.id);
      if (result.ok) onSaved();
      else {
        setRemoveError(result.message);
        setConfirming(false);
      }
    });
  }

  const parsed = validateIngredient({ foodId: food.id, amount });
  const typed = parsed.ok ? parsed.value.amount : null;
  const preview =
    typed === null
      ? null
      : {
          ...nutrientsForAmount(food, typed),
          cost: costOfAmount(food.price, food.package_size, typed),
        };
  const hydrates = food.unit === "ml" && food.counts_toward_hydration;
  const errors = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);
  const saveMessage = state === hiddenSaveAnswer ? undefined : (state.message ?? errors.foodId);
  // Hidden while trying again, so a second failure with the same words
  // still shows (and is read out).
  const message = pending || removing ? undefined : (removeError ?? saveMessage);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setRemoveError(undefined)}
      className="space-y-5 pt-1"
      noValidate
    >
      <input type="hidden" name="recipeId" value={recipeId} />
      <input type="hidden" name="foodId" value={food.id} />

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="focus-ring -ml-2 flex h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          All foods
        </button>
      )}
      {/* h3: under the sheet's own h2 title. */}
      <h3 className="text-lg font-medium">{food.name}</h3>

      <div className="space-y-2">
        <AmountField
          unit={food.unit}
          value={amount}
          onChange={setAmount}
          error={errors.amount}
          autoFocus={isNew}
        />
        <AmountPreview values={preview} />
        {/* Water in a recipe counts toward hydration the same way as on its
            own. Water you pour away (pasta, boiled eggs) shouldn't count,
            so the hint says to leave it out. */}
        {hydrates && (
          <p className="text-label text-muted-foreground tabular-nums">
            {typed === null ? "Counts toward water." : `Counts toward water: ${waterText(typed)}.`}{" "}
            Leave out water you drain away.
          </p>
        )}
      </div>

      {/* Read out as soon as it appears; opens its space smoothly. */}
      <ErrorLine show={Boolean(message)} gap="5">
        {message}
      </ErrorLine>

      {/* focusableWhenDisabled: keeps keyboard focus while it works. */}
      <Button
        type="submit"
        disabled={pending || removing}
        focusableWhenDisabled
        // Greyed while a remove runs; full colour while it saves itself.
        data-unavailable={removing || undefined}
        className="press-wide h-11 w-full text-base"
      >
        {isNew ? (pending ? "Adding…" : "Add") : pending ? "Saving…" : "Save changes"}
      </Button>

      {!isNew &&
        (confirming ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm">Remove from recipe?</span>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              // Not while a save is still running: if the remove landed
              // first, the save would put the ingredient straight back.
              disabled={pending || removing}
              focusableWhenDisabled
              data-unavailable={pending || undefined}
              className="h-11 px-4 text-base"
            >
              {removing ? "Removing…" : "Yes, remove"}
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
            ref={removeRef}
            type="button"
            variant="ghost"
            onClick={() => setConfirming(true)}
            disabled={pending || removing}
            focusableWhenDisabled
            data-unavailable={pending || removing || undefined}
            className="press-wide h-11 w-full text-base text-destructive"
          >
            Remove
          </Button>
        ))}
    </form>
  );
}
