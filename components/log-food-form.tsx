"use client";

// Step 2 of logging: how much, and which meal. The preview is only a guide;
// the server works out the real snapshot from the saved food.

import { useActionState, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { costOfAmount } from "@/lib/cost";
import { logFood } from "@/lib/entry-actions";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { nutrientsForAmount } from "@/lib/nutrition";
import type { Food, FormState } from "@/lib/types";
import { AmountField } from "./amount-field";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";

export function LogFoodForm({
  food,
  day,
  initialMeal,
  onBack,
  onDone,
}: {
  food: Food;
  day: string;
  initialMeal: Meal;
  onBack: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [meal, setMeal] = useState<Meal>(initialMeal);

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await logFood(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    { ok: false },
  );

  const parsed = validateEntryChange({ meal, amount });
  const preview = parsed.ok
    ? {
        ...nutrientsForAmount(food, parsed.value.amount),
        cost: costOfAmount(food.price, food.package_size, parsed.value.amount),
      }
    : null;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5 pt-1" noValidate>
      <input type="hidden" name="foodId" value={food.id} />
      <input type="hidden" name="day" value={day} />

      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        All foods
      </button>
      <p className="text-lg font-medium">{food.name}</p>

      <div className="space-y-2">
        <AmountField
          unit={food.unit}
          value={amount}
          onChange={setAmount}
          error={errors.amount}
          autoFocus
        />
        <AmountPreview values={preview} />
      </div>

      <SegmentedControl
        name="meal"
        label="Meal"
        options={MEAL_OPTIONS}
        value={meal}
        onChange={setMeal}
      />

      {(state.message ?? errors.day ?? errors.foodId ?? errors.meal) && (
        <p className="text-sm text-destructive">
          {state.message ?? errors.day ?? errors.foodId ?? errors.meal}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Logging…" : "Log it"}
      </Button>
    </form>
  );
}
