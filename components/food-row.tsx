"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { keepOnFailure } from "@/lib/action-call";
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

  // A failed delete swaps Yes back for ✕: focus goes there instead of
  // falling out to the page.
  const deleteRef = useRef<HTMLButtonElement>(null);
  // Waits for `deleting` to end too: the error is drawn a moment before
  // Yes goes away (Yes stays while deleting), and only then does focus
  // fall to the page.
  // Was the button you just pressed focused (keyboard, or a mouse)? Only
  // then does focus follow the buttons around. A tap on iPhone never
  // focuses a button, and focus moved by code after a tap draws Safari's
  // ring, so taps are left alone.
  const pressedWithFocus = useRef(false);
  const notePress = (e: React.MouseEvent) => {
    pressedWithFocus.current = document.activeElement === e.currentTarget;
  };

  useEffect(() => {
    if (error && !deleting && pressedWithFocus.current) deleteRef.current?.focus();
  }, [error, deleting]);

  // ✕ and the Yes / Cancel line swap places, so the button that had focus
  // disappears: send focus to the one that appeared (Yes when the
  // question opens, ✕ after Cancel).
  const wasConfirming = useRef(confirming);
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (wasConfirming.current === confirming) return;
    wasConfirming.current = confirming;
    if (!pressedWithFocus.current) return;
    if (confirming) yesRef.current?.focus();
    else if (!deleting) deleteRef.current?.focus();
  }, [confirming, deleting]);

  function handleDelete() {
    setError(undefined);
    startDelete(async () => {
      const result = await keepOnFailure(deleteFood, {
        verb: "delete it",
        retry: "delete it again",
      })(food.id);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div className={cn("rounded-lg px-3 transition-colors", isEditing && "bg-primary/10")}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="focus-ring flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md py-3 text-left"
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

          <span className="text-label text-muted-foreground tabular-nums">
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
        </button>

        {!(confirming || deleting) && (
          <div className="flex min-h-16 items-center">
            <Button
              ref={deleteRef}
              size="icon"
              variant="ghost"
              className="size-11 text-muted-foreground"
              onClick={(e) => {
                notePress(e);
                setConfirming(true);
              }}
              aria-label={`Delete ${name}`}
            >
              ✕
            </Button>
          </div>
        )}
      </div>

      {/* The question gets its own line under the food, so the name and
          macros keep their full width (beside them, the 44 px Yes and
          Cancel squeezed the name on a small phone). */}
      {(confirming || deleting) && (
        <div className="-mt-1 flex items-center justify-end gap-1 pb-2">
          {/* While it works, "Delete?" becomes "Deleting…" and Cancel goes
              (it couldn't stop it anyway). Yes stays, focusable but
              waiting, so keyboard focus isn't dropped to the page. */}
          <span className="mr-1 text-sm">{deleting ? "Deleting…" : `Delete ${name}?`}</span>
          {/* 44 px tall, the size phones recommend for a tap. */}
          <Button
            ref={yesRef}
            size="sm"
            variant="destructive"
            className="h-11 px-3"
            onClick={(e) => {
              notePress(e);
              handleDelete();
            }}
            disabled={deleting}
            focusableWhenDisabled
            // "Yes" alone doesn't say to what, for a screen reader.
            aria-label={`Yes, delete ${name}`}
          >
            Yes
          </Button>
          {!deleting && (
            <Button
              size="sm"
              variant="ghost"
              className="h-11 px-3"
              onClick={(e) => {
                notePress(e);
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
      {/* Outside the row's button (inside, it was read as part of the
          button's name), and read out as soon as it appears. */}
      {error && (
        <p role="alert" className="-mt-2 pb-3 text-sm text-destructive">
          {error}
        </p>
      )}
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
      <span className="text-label leading-6 whitespace-nowrap text-muted-foreground">
        {basisLabel(food.unit)}
      </span>
    </span>
  );
}
