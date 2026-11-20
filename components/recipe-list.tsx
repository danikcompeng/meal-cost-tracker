"use client";

// The Recipes list, and the "New recipe" sheet. Creating a recipe takes
// you straight to it, to add ingredients.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./bottom-sheet";
import { RecipeForm } from "./recipe-form";
import { RecipeTile } from "./recipe-tile";

export function RecipeList({ recipes, hasFoods }: { recipes: Recipe[]; hasFoods: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const reduceMotion = useReducedMotion();

  // A recipe is made of your foods, so with none there's nothing to use.
  const newButton = hasFoods ? (
    <Button onClick={() => setCreating(true)} className="press-wide h-11 w-full text-base">
      New recipe
    </Button>
  ) : (
    <Link href="/foods" className={cn(buttonVariants(), "press-wide h-11 w-full text-base")}>
      Add foods first
    </Link>
  );

  return (
    <>
      {recipes.length === 0 ? (
        <section className="rounded-2xl bg-card px-5 py-10 text-center">
          <h2 className="text-lg font-semibold">Your staple meals go here</h2>
          <p className="mx-auto mt-2 mb-6 max-w-xs text-muted-foreground">
            Put a few foods together once, then log the whole meal with one tap.
          </p>
          {newButton}
        </section>
      ) : (
        <div className="space-y-3">
          {newButton}
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {recipes.map((recipe) => (
                <motion.li
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  // Reduce Motion would jump the height to 0 before the
                  // fade shows (food-list.tsx): fade only then.
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: DURATION.base, ease: EASE_OUT }}
                >
                  <RecipeTile recipe={recipe} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {creating && (
        <BottomSheet title="New recipe" onClose={() => setCreating(false)}>
          <RecipeForm onDone={(id) => id && router.push(`/recipes/${id}`)} />
        </BottomSheet>
      )}
    </>
  );
}
