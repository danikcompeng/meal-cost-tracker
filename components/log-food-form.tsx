"use client";

// Step 2 of logging: how much, and which meal. The preview is only a guide;
// the server works out the real snapshot from the saved food.

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { keepOnFailure, refreshIfReachable, tapAgain } from "@/lib/action-call";
import { costOfAmount } from "@/lib/cost";
import { logFood } from "@/lib/entry-actions";
import { validateEntryChange } from "@/lib/entry-validation";
import { MEAL_OPTIONS, type Meal } from "@/lib/meals";
import { nutrientsForAmount } from "@/lib/nutrition";
import type { Food, FormState } from "@/lib/types";
import { AmountField } from "./amount-field";
import { AmountPreview } from "./amount-preview";
import { SegmentedControl } from "./segmented-control";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function LogFoodForm({
  food,
  day,
  initialMeal,
  backLabel = "All foods",
  onBack,
  onDone,
}: {
  food: Food;
  day: string;
  initialMeal: Meal;
  /** What the back button returns to: "Recipes and foods" when you have recipes. */
  backLabel?: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [meal, setMeal] = useState<Meal>(initialMeal);

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      // Offline: a message here, and the amount you typed stays. If the
      // connection dropped on the way it may have been logged anyway, so
      // Today reloads behind the sheet and the message says to check it.
      const result = await keepOnFailure(
        logFood,
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

  const parsed = validateEntryChange({ meal, amount });
  const preview = parsed.ok
    ? {
        ...nutrientsForAmount(food, parsed.value.amount),
        cost: costOfAmount(food.price, food.package_size, parsed.value.amount),
      }
    : null;
  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-5 pt-1" noValidate>
      <input type="hidden" name="foodId" value={food.id} />
      <input type="hidden" name="day" value={day} />

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
      {!pending && (state.message ?? errors.day ?? errors.foodId ?? errors.meal) && (
        <p role="alert" className="text-sm text-destructive">
          {state.message ?? errors.day ?? errors.foodId ?? errors.meal}
        </p>
      )}

      {/* Keeps keyboard focus while it works. */}
      <Button type="submit" disabled={pending} focusableWhenDisabled className="h-11 w-full text-base">
        {pending ? "Logging…" : "Log it"}
      </Button>
    </form>
  );
}
