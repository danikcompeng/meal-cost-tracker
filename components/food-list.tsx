"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { Food } from "@/lib/types";
import { FoodRow } from "./food-row";

export function FoodList({
  foods,
  editingId,
  onEdit,
}: {
  foods: Food[];
  editingId: string | null;
  onEdit: (food: Food) => void;
}) {
  const reduceMotion = useReducedMotion();
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
            // With Reduce Motion, Framer jumps height straight to 0 (it
            // skips to the end of anything that moves or resizes), which
            // would hide the row before its fade could show: fade only.
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
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
