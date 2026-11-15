"use client";

// The Recipes list, and the "New recipe" sheet. Creating a recipe takes
// you straight to it, to add ingredients.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./bottom-sheet";
import { RecipeForm } from "./recipe-form";
import { RecipeTile } from "./recipe-tile";

export function RecipeList({ recipes, hasFoods }: { recipes: Recipe[]; hasFoods: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  // A recipe is made of your foods, so with none there's nothing to use.
  const newButton = hasFoods ? (
    <Button onClick={() => setCreating(true)} className="h-11 w-full text-base">
      New recipe
    </Button>
  ) : (
    <Link href="/foods" className={cn(buttonVariants(), "h-11 w-full text-base")}>
      Add foods first
    </Link>
  );

  return (
    // reducedMotion="user": if your phone asks for less motion, Framer
    // Motion skips movement and keeps only gentle fades.
    <MotionConfig reducedMotion="user">
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
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
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
    </MotionConfig>
  );
}
