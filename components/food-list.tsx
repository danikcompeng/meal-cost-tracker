"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FoodRow } from "./food-row";
import type { Food } from "@/lib/types";

export function FoodList({
  foods,
  editingId,
  onEdit,
}: {
  foods: Food[];
  editingId: string | null;
  onEdit: (food: Food) => void;
}) {
  if (foods.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No foods yet — add your first one above.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {/* AnimatePresence lets rows fade out when deleted instead of vanishing. */}
      <AnimatePresence initial={false}>
        {foods.map((food) => (
          <motion.li
            key={food.id}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <FoodRow
              food={food}
              isEditing={food.id === editingId}
              onEdit={() => onEdit(food)}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
