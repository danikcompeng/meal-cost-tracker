"use client";

// Step 2 of logging: how much, and which meal. The preview is only a guide;
// the server works out the real snapshot from the saved food.
//
// "Log it" checks what you typed here, with the same rules as the server,
// then hands it to Today, which closes the sheet and shows the entry at
// once while it saves (today-view.tsx). If the save fails, Today opens
// this sheet again with what you typed (`draft`) and the reason.

import { useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { costOfAmount } from "@/lib/cost";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { nutrientsForAmount } from "@/lib/nutrition";
import type { Draft, Typed } from "@/lib/optimistic-entries";
import { servingOf } from "@/lib/servings";
import type { Food, FormState } from "@/lib/types";
import { AmountField } from "./amount-field";
import { ErrorLine } from "./collapse";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";
import { ServingPicks } from "./serving-picks";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function LogFoodForm({
  food,
  initialMeal,
  backLabel = "All foods",
  draft,
  onBack,
  onLog,
}: {
  food: Food;
  initialMeal: Meal;
  /** What the back button returns to: "Recipes and foods" when you have recipes. */
  backLabel?: string;
  /** A save that failed: what you typed, and why it didn't save. */
  draft?: Draft;
  onBack: () => void;
  /** It passed the checks: Today logs it. */
  onLog: (typed: Typed) => void;
}) {
  const [amount, setAmount] = useState(draft?.amount ?? "");
  const [meal, setMeal] = useState<Meal>(draft?.meal ?? initialMeal);
  const [state, setState] = useState<FormState>(draft?.state ?? { ok: false });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const checked = validateEntryChange({ meal, amount });
    if (!checked.ok) {
      setState({ ok: false, fieldErrors: checked.fieldErrors });
      return;
    }
    onLog({ text: amount, ...checked.value });
  }

  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  const parsed = validateEntryChange({ meal, amount });
  const preview = parsed.ok
    ? {
        ...nutrientsForAmount(food, parsed.value.amount),
        cost: costOfAmount(food.price, food.package_size, parsed.value.amount),
      }
    : null;
  const errors = state.fieldErrors ?? {};
  // "1 bagel = 80 g": quick picks that fill in the grams.
  const serving = servingOf(food);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 pt-1" noValidate>

      <button
        type="button"
        onClick={onBack}
        className="focus-ring -ml-2 flex h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </button>
      {/* h3: under the sheet's own h2 title ("Add to lunch"). */}
      <h3 className="text-lg font-medium">{food.name}</h3>

      <div className="space-y-2">
        <AmountField
          unit={food.unit}
          value={amount}
          onChange={setAmount}
          error={errors.amount}
          autoFocus
        />
        {serving && <ServingPicks serving={serving} unit={food.unit} value={amount} onPick={setAmount} />}
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
      <ErrorLine show={Boolean(state.message ?? errors.day ?? errors.foodId ?? errors.meal)} gap="5">
        {state.message ?? errors.day ?? errors.foodId ?? errors.meal}
      </ErrorLine>

      <Button type="submit" className="press-wide h-11 w-full text-base">
        Log it
      </Button>
    </form>
  );
}
