"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteIngredient } from "@/lib/ingredient-actions";
import { formatMoney, unitPriceLabel } from "@/lib/cost";
import type { Ingredient } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizeFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

export function IngredientRow({
  ingredient,
  isEditing,
  onEdit,
}: {
  ingredient: Ingredient;
  isEditing: boolean;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [deleting, startDelete] = useTransition();
  const { name, price, package_size, unit } = ingredient;

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteIngredient(ingredient.id);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex min-h-16 items-center gap-2 rounded-lg px-3 transition-colors",
        isEditing && "bg-primary/10",
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 flex-col items-start py-3 text-left"
      >
        <span className="font-medium">{name}</span>
        <span className="text-sm text-muted-foreground">
          {formatMoney(price)} / {sizeFormat.format(package_size)} {unit}
          {error && <span className="ml-2 text-destructive">{error}</span>}
        </span>
      </button>

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
        <>
          <span className="text-sm whitespace-nowrap tabular-nums">
            {unitPriceLabel(price, package_size, unit)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${name}`}
          >
            ✕
          </Button>
        </>
      )}
    </div>
  );
}
