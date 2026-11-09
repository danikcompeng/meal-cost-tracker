"use client";

// Holds the one piece of shared state: which food (if any) is being
// edited. The form and the list both need to know it.
import { useState } from "react";
import { FoodForm } from "./food-form";
import { FoodList } from "./food-list";
import type { Food } from "@/lib/types";

export function FoodManager({ foods }: { foods: Food[] }) {
  const [editing, setEditing] = useState<Food | null>(null);

  function startEditing(food: Food) {
    setEditing(food);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      <section aria-label={editing ? "Edit food" : "Add food"}>
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
