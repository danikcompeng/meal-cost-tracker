"use client";

// Holds the one piece of shared state: which ingredient (if any) is being
// edited. The form and the list both need to know it.
import { useState } from "react";
import { IngredientForm } from "./ingredient-form";
import { IngredientList } from "./ingredient-list";
import type { Ingredient } from "@/lib/types";

export function IngredientManager({ ingredients }: { ingredients: Ingredient[] }) {
  const [editing, setEditing] = useState<Ingredient | null>(null);

  function startEditing(ingredient: Ingredient) {
    setEditing(ingredient);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      <section aria-label={editing ? "Edit ingredient" : "Add ingredient"}>
        {/* Changing the key gives the form a fresh start for each ingredient. */}
        <IngredientForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setEditing(null)}
        />
      </section>

      <section aria-label="Your ingredients">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {ingredients.length} {ingredients.length === 1 ? "ingredient" : "ingredients"}
        </h2>
        <IngredientList
          ingredients={ingredients}
          editingId={editing?.id ?? null}
          onEdit={startEditing}
        />
      </section>
    </div>
  );
}
