"use client";

// Step 2 of logging a recipe: how many servings (1 to start, so your usual
// single serving is one tap), and which meal. The preview is only a guide;
// the server works out the real snapshot from the saved recipe and foods.
//
// Like LogFoodForm, "Log it" checks here and hands it to Today, which
// shows it at once while it saves, and opens this again with your
// servings (`draft`) if the save fails.

import { useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { recipeSnapshotFor } from "@/lib/nutrition";
import type { Draft, Typed } from "@/lib/optimistic-entries";
import type { FormState, Recipe } from "@/lib/types";
import { AmountField } from "./amount-field";
import { ErrorLine } from "./collapse";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function LogRecipeForm({
  recipe,
  initialMeal,
  draft,
  onBack,
  onLog,
}: {
  recipe: Recipe;
  initialMeal: Meal;
  /** A save that failed: what you typed, and why it didn't save. */
  draft?: Draft;
  onBack: () => void;
  /** It passed the checks: Today logs it. */
  onLog: (typed: Typed) => void;
}) {
  const [amount, setAmount] = useState(draft?.amount ?? "1");
  const [meal, setMeal] = useState<Meal>(draft?.meal ?? initialMeal);
  const [state, setState] = useState<FormState>(draft?.state ?? { ok: false });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const checked = validateEntryChange({ meal, amount, unit: "serving" });
    if (!checked.ok) {
      setState({ ok: false, fieldErrors: checked.fieldErrors });
      return;
    }
    onLog({ text: amount, ...checked.value });
  }

  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  // Same rules as the server: above 0, at most 20 servings.
  const parsed = validateEntryChange({ meal, amount, unit: "serving" });
  const preview = parsed.ok ? recipeSnapshotFor(recipe, parsed.value.amount) : null;
  const errors = state.fieldErrors ?? {};
  const message = state.message ?? errors.day ?? errors.recipeId ?? errors.meal;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 pt-1" noValidate>

      <button
        type="button"
        onClick={onBack}
        className="focus-ring -ml-2 flex h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Recipes and foods
      </button>
      {/* h3: under the sheet's own h2 title ("Add to lunch"). */}
      <h3 className="text-lg font-medium">{recipe.name}</h3>

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

      {/* Read out as soon as it appears. */}
      <ErrorLine show={Boolean(message)} gap="5">
        {message}
      </ErrorLine>

      {/* Focus starts here, not in the Servings box: it's already 1, and
          focusing a box would pop up the phone keyboard and get in the way
          of the one-tap "Log it". Without any autofocus, keyboard and
          screen-reader users would land on the page itself, lost. */}
      <Button type="submit" autoFocus className="press-wide h-11 w-full text-base">
        Log it
      </Button>
    </form>
  );
}
