"use client";

// Holds the one piece of shared state: which food (if any) is being
// edited. The form and the list both need to know it.
import { useEffect, useRef, useState } from "react";
import { FoodForm } from "./food-form";
import { FoodList } from "./food-list";
import type { Food } from "@/lib/types";

export function FoodManager({ foods }: { foods: Food[] }) {
  const [editing, setEditing] = useState<Food | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function startEditing(food: Food) {
    setEditing(food);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Tapping a food scrolls up to the form; keyboard and screen-reader
  // focus goes there too ("Edit Rolled oats"), instead of staying on the
  // row far below.
  // After Cancel or Save the form is rebuilt for a new food, and the
  // button you pressed goes with it: focus would fall to the top of the
  // page, so it goes to the heading (now "Add a food") instead. The
  // heading is invisible, so no ring can show on a phone.
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) headingRef.current?.focus({ preventScroll: true });
    else if (wasEditing.current && document.activeElement === document.body) {
      headingRef.current?.focus({ preventScroll: true });
    }
    wasEditing.current = editing !== null;
  }, [editing]);

  return (
    <div className="space-y-10">
      <section aria-labelledby="food-form-title">
        {/* For screen readers only: the form itself shows which food it
            holds. tabIndex -1 lets code move focus here; Tab skips it. */}
        <h2 ref={headingRef} id="food-form-title" tabIndex={-1} className="sr-only">
          {editing ? `Edit ${editing.name}` : "Add a food"}
        </h2>
        {/* Changing the key gives the form a fresh start for each food. */}
        <FoodForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setEditing(null)}
        />
      </section>

      <section aria-label="Your foods">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {foods.length} {foods.length === 1 ? "food" : "foods"}
        </h2>
        <FoodList
          foods={foods}
          editingId={editing?.id ?? null}
          onEdit={startEditing}
        />
      </section>
    </div>
  );
}
