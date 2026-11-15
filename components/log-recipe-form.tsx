"use client";

// Step 2 of logging a recipe: how many servings (1 to start, so your usual
// single serving is one tap), and which meal. The preview is only a guide;
// the server works out the real snapshot from the saved recipe and foods.

import { useActionState, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logRecipe } from "@/lib/entry-actions";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { recipeSnapshotFor } from "@/lib/nutrition";
import type { FormState, Recipe } from "@/lib/types";
import { AmountField } from "./amount-field";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";

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
  const [amount, setAmount] = useState("1");
  const [meal, setMeal] = useState<Meal>(initialMeal);

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await logRecipe(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    { ok: false },
  );

  // Same rules as the server: above 0, at most 20 servings.
  const parsed = validateEntryChange({ meal, amount, unit: "serving" });
  const preview = parsed.ok ? recipeSnapshotFor(recipe, parsed.value.amount) : null;
  const errors = state.fieldErrors ?? {};
  const message = state.message ?? errors.day ?? errors.recipeId ?? errors.meal;

  return (
    <form action={formAction} className="space-y-5 pt-1" noValidate>
      <input type="hidden" name="recipeId" value={recipe.id} />
      <input type="hidden" name="day" value={day} />

      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
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

      {message && <p className="text-sm text-destructive">{message}</p>}

      {/* Focus starts here, not in the Servings box: it's already 1, and
          focusing a box would pop up the phone keyboard and get in the way
          of the one-tap "Log it". Without any autofocus, keyboard and
          screen-reader users would land on the page itself, lost. */}
      <Button type="submit" disabled={pending} autoFocus className="h-11 w-full text-base">
        {pending ? "Logging…" : "Log it"}
      </Button>
    </form>
  );
}
