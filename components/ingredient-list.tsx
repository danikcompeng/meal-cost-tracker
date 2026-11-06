"use client";

import { AnimatePresence, motion } from "framer-motion";
import { IngredientRow } from "./ingredient-row";
import type { Ingredient } from "@/lib/types";

export function IngredientList({
  ingredients,
  editingId,
  onEdit,
}: {
  ingredients: Ingredient[];
  editingId: string | null;
  onEdit: (ingredient: Ingredient) => void;
}) {
  if (ingredients.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No ingredients yet — add your first one above.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {/* AnimatePresence lets rows fade out when deleted instead of vanishing. */}
      <AnimatePresence initial={false}>
        {ingredients.map((ingredient) => (
          <motion.li
            key={ingredient.id}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <IngredientRow
              ingredient={ingredient}
              isEditing={ingredient.id === editingId}
              onEdit={() => onEdit(ingredient)}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
