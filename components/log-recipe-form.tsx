"use client";

// Step 2 of logging a recipe: how many servings (1 to start, so your usual
// single serving is one tap), and which meal. The preview is only a guide;
// the server works out the real snapshot from the saved recipe and foods.

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { keepOnFailure, refreshIfReachable, tapAgain } from "@/lib/action-call";
import { logRecipe } from "@/lib/entry-actions";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { recipeSnapshotFor } from "@/lib/nutrition";
import type { FormState, Recipe } from "@/lib/types";
import { AmountField } from "./amount-field";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function LogRecipeForm({
  recipe,
  day,
  initialMeal,
  onBack,
  onDone,
}: {
  recipe: Recipe;
  day: string;
  initialMeal: Meal;
  onBack: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("1");
  const [meal, setMeal] = useState<Meal>(initialMeal);

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      // Offline: a message here, and the servings you typed stay. If the
      // connection dropped on the way it may have been logged anyway, so
      // Today reloads behind the sheet and the message says to check it.
      const result = await keepOnFailure(
        logRecipe,
        tapAgain("log it", "Log it", "Check Today"),
        () => void refreshIfReachable(() => router.refresh()),
      )(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    { ok: false },
  );

  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  // Same rules as the server: above 0, at most 20 servings.
  const parsed = validateEntryChange({ meal, amount, unit: "serving" });
  const preview = parsed.ok ? recipeSnapshotFor(recipe, parsed.value.amount) : null;
  const errors = state.fieldErrors ?? {};
  const message = state.message ?? errors.day ?? errors.recipeId ?? errors.meal;

  return (
    <form ref={formRef} action={formAction} className="space-y-5 pt-1" noValidate>
      <input type="hidden" name="recipeId" value={recipe.id} />
      <input type="hidden" name="day" value={day} />

      <button
        type="button"
        onClick={onBack}
        className="focus-ring -ml-2 flex h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Recipes and foods
      </button>
      <p className="text-lg font-medium">{recipe.name}</p>

      <div className="space-y-2">
        <AmountField unit="serving" value={amount} onChange={setAmount} error={errors.amount} />
        <AmountPreview values={preview} />
      </div>

      <SegmentedControl
        name="meal"
        label="Meal"
        options={MEAL_OPTIONS}
        value={meal}
        onChange={setMeal}
      />

      {/* Read out as soon as it appears; hidden while trying again so a
          second failure with the same words still shows. */}
      {!pending && message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}

      {/* Focus starts here, not in the Servings box: it's already 1, and
          focusing a box would pop up the phone keyboard and get in the way
          of the one-tap "Log it". Without any autofocus, keyboard and
          screen-reader users would land on the page itself, lost. */}
      {/* focusableWhenDisabled: keeps keyboard focus while it works. */}
      <Button
        type="submit"
        disabled={pending}
        focusableWhenDisabled
        autoFocus
        className="h-11 w-full text-base"
      >
        {pending ? "Logging…" : "Log it"}
      </Button>
    </form>
  );
}
