"use client";

// The interactive part of the recipe screen. It holds one piece of state:
// which sheet is open (editing the recipe, adding an ingredient, or
// changing one), if any.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { recipeTotals } from "@/lib/recipe-totals";
import type { EatenRow } from "@/lib/swap";
import type { Food, Recipe, RecipeIngredient } from "@/lib/types";
import { amountText } from "@/lib/units";
import { BottomSheet } from "./bottom-sheet";
import { DeleteRecipe } from "./delete-recipe";
import { FoodPicker } from "./food-picker";
import { IngredientForm } from "./ingredient-form";
import { IngredientRow } from "./ingredient-row";
import { RecipeCost } from "./recipe-cost";
import { RecipeForm } from "./recipe-form";
import { RecipeNutrients } from "./recipe-nutrients";
import { SwapButton } from "./swap-button";
import { SwapSheet } from "./swap-sheet";

type Sheet =
  | { mode: "edit" }
  // Adding: pick a food, then its amount. `added` is the food you just
  // added, so the list can say so while you pick the next one.
  | { mode: "add"; food: Food | null; added: string | null }
  | { mode: "ingredient"; ingredient: RecipeIngredient }
  | { mode: "swap" }
  | null;

export function RecipeView({
  recipe,
  foods,
  recipes,
  history,
  today,
}: {
  recipe: Recipe;
  foods: Food[];
  /** All your recipes, for "Tired of this?". */
  recipes: Recipe[];
  /** What you ate lately; null if it didn't load. */
  history: EatenRow[] | null;
  today: string;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(null);
  const reduceMotion = useReducedMotion();
  const close = () => setSheet(null);
  const { ingredients } = recipe;
  const [opening, startOpening] = useTransition();
  // The meal you're tired of, per serving. Kept as the same object between
  // redraws, so the swap stack doesn't re-rank for nothing.
  const swapCurrent = useMemo(() => {
    const { per, cost } = recipeTotals(recipe);
    return { recipeId: recipe.id, name: recipe.name, protein: per.protein_g, cost };
  }, [recipe]);
  // The food whose amount you're typing in the Add sheet, if any.
  const adding = sheet?.mode === "add" ? sheet.food : null;

  // Each food is in a recipe once, so picking one that's already there
  // changes its amount instead of adding it twice.
  const inRecipe = new Map(ingredients.map((i) => [i.food.id, i]));
  function pick(food: Food) {
    const existing = inRecipe.get(food.id);
    setSheet(existing ? { mode: "ingredient", ingredient: existing } : { mode: "add", food, added: null });
  }

  return (
    <>
      <header className="mb-8">
        <Link
          href="/recipes"
          className="focus-ring -ml-2 flex h-11 w-fit items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Recipes
        </Link>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="min-w-0 text-3xl leading-tight font-bold break-words">{recipe.name}</h1>
          <button
            type="button"
            onClick={() => setSheet({ mode: "edit" })}
            // px-3: "Edit" is short, so this keeps it at least 44 px wide.
            className="focus-ring -mr-3 flex h-11 min-w-11 shrink-0 items-center justify-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
        </div>
      </header>

      <RecipeCost recipe={recipe} />
      {ingredients.length > 0 && (
        <>
          <SwapButton onClick={() => setSheet({ mode: "swap" })} className="mt-4" />
          <RecipeNutrients recipe={recipe} />
        </>
      )}

      <section aria-labelledby="ingredients" className="mt-8">
        <h2 id="ingredients" className="mb-1 px-3 text-label font-medium text-muted-foreground tabular-nums">
          Ingredients{ingredients.length > 0 && ` · ${ingredients.length}`}
        </h2>
        <ul>
          <AnimatePresence initial={false}>
            {ingredients.map((ingredient) => (
              <motion.li
                key={ingredient.food.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                // Reduce Motion would jump the height to 0 before the fade
                // shows (food-list.tsx): fade only then.
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: DURATION.base, ease: EASE_OUT }}
              >
                <IngredientRow
                  ingredient={ingredient}
                  onOpen={() => setSheet({ mode: "ingredient", ingredient })}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <button
          type="button"
          onClick={() => setSheet({ mode: "add", food: null, added: null })}
          className="focus-ring press-wide mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add ingredient
        </button>
      </section>

      {sheet?.mode === "edit" && (
        <BottomSheet title="Edit recipe" onClose={close}>
          <RecipeForm recipe={recipe} onDone={close} />
          <DeleteRecipe recipeId={recipe.id} />
        </BottomSheet>
      )}

      {sheet?.mode === "add" && (
        <BottomSheet title="Add ingredient" onClose={close}>
          {adding ? (
            <IngredientForm
              recipeId={recipe.id}
              food={adding}
              onBack={() => setSheet({ ...sheet, food: null })}
              // Back to the list for the next one, saying what was added.
              // Only if you're still on this food: a save can finish after
              // you closed the sheet, and it mustn't pop it open again.
              onSaved={() =>
                setSheet((s) =>
                  s?.mode === "add" && s.food?.id === adding.id
                    ? { mode: "add", food: null, added: adding.name }
                    : s,
                )
              }
            />
          ) : (
            <>
              {sheet.added && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p role="status" className="min-w-0 truncate text-sm text-muted-foreground">
                    Added {sheet.added}
                  </p>
                  <Button variant="ghost" onClick={close} className="h-11 shrink-0 text-base">
                    Done
                  </Button>
                </div>
              )}
              <FoodPicker
                foods={foods}
                onPick={pick}
                noteFor={(food) => {
                  const existing = inRecipe.get(food.id);
                  return existing ? `In recipe · ${amountText(existing.amount, food.unit)}` : null;
                }}
              />
            </>
          )}
        </BottomSheet>
      )}

      {sheet?.mode === "ingredient" && (
        <BottomSheet title="Edit ingredient" onClose={close}>
          <IngredientForm
            recipeId={recipe.id}
            food={sheet.ingredient.food}
            currentAmount={sheet.ingredient.amount}
            // Close only this sheet: if you already opened another one
            // while it was saving, leave that alone.
            onSaved={() => setSheet((s) => (s?.mode === "ingredient" ? null : s))}
          />
        </BottomSheet>
      )}

      {sheet?.mode === "swap" && (
        <SwapSheet
          current={swapCurrent}
          recipes={recipes}
          history={history}
          today={today}
          // Nothing logged here, so the cards show one serving.
          servings={1}
          pickLabel="Open it"
          dragLabel="Open"
          pendingLabel={opening ? "Opening…" : null}
          // Fetch the top card's page in the background, so "Open it"
          // doesn't wait for the server on a slow phone signal.
          onTop={(swap) => router.prefetch(`/recipes/${swap.id}`)}
          // Nothing to replace on a recipe screen: "Open it" goes to that
          // recipe. The page there is a fresh view, so this sheet closes.
          // Inside a transition, `opening` is true until the page arrives.
          onPick={(swap) => startOpening(() => router.push(`/recipes/${swap.id}`))}
          onClose={close}
        />
      )}
    </>
  );
}
