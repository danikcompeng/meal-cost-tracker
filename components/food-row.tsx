"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteFood } from "@/lib/food-actions";
import { pricePerUnit, unitPriceLabel } from "@/lib/cost";
import { basisLabel, hasAnyMacro, macroText } from "@/lib/macros";
import type { Food } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FoodRow({
  food,
  isEditing,
  onEdit,
}: {
  food: Food;
  isEditing: boolean;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [deleting, startDelete] = useTransition();
  const { name, price, package_size, unit } = food;
  const hasPrice = pricePerUnit(price, package_size) !== null;

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteFood(food.id);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 transition-colors",
        isEditing && "bg-primary/10",
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 py-3 text-left"
      >
        <span className="font-medium">
          {name}
          {food.brand && <span className="font-normal text-muted-foreground"> · {food.brand}</span>}
        </span>

        {hasAnyMacro(food) ? (
          <MacroLine food={food} />
        ) : (
          <span className="text-muted-foreground">No macros yet, tap to add</span>
        )}

        <span className="text-[13px] text-muted-foreground tabular-nums">
          {hasPrice ? (
            unitPriceLabel(price, package_size, unit)
          ) : (
            // A bare "—" may be read as nothing by screen readers,
            // so give them words instead.
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">price unavailable</span>
            </>
          )}
        </span>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </button>

      <div className="flex min-h-16 items-center">
        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-sm">Delete?</span>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "…" : "Yes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${name}`}
          >
            ✕
          </Button>
        )}
      </div>
    </div>
  );
}

const MACROS = [
  { key: "kcal", unit: "kcal", label: undefined, spoken: "calories" },
  { key: "protein_g", unit: "g", label: "protein", spoken: "protein" },
  { key: "carbs_g", unit: "g", label: "carbs", spoken: "carbs" },
  { key: "fat_g", unit: "g", label: "fat", spoken: "fat" },
] as const;

// "350 kcal · 13 g protein · 60 g carbs · 7 g fat". Each item keeps its
// number and label together (whitespace-nowrap), so on a narrow phone the
// line only wraps between items, never in the middle of "13 g".
function MacroLine({ food }: { food: Food }) {
  return (
    <span className="flex flex-wrap gap-x-1.5 tabular-nums">
      {MACROS.map(({ key, unit, label, spoken }, i) => {
        const value = food[key];
        return (
          <span key={key} className="whitespace-nowrap">
            {i > 0 && (
              <span aria-hidden="true" className="mr-1.5 text-muted-foreground">
                ·
              </span>
            )}
            {value === null ? (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  {macroText(null, unit, label)}
                </span>
                <span className="sr-only">{spoken} not set</span>
              </>
            ) : (
              <span className={key === "protein_g" ? "font-medium text-primary" : undefined}>
                {macroText(value, unit, label)}
              </span>
            )}
          </span>
        );
      })}
      {/* Says what the numbers are per, right next to them, so it can't be
          mistaken for part of the price below. */}
      <span className="text-[13px] leading-6 whitespace-nowrap text-muted-foreground">
        {basisLabel(food.unit)}
      </span>
    </span>
  );
}
