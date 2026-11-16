"use client";

// Step 1 of logging, or of adding an ingredient: pick one of YOUR foods.
// Recently logged foods are at the top (the list arrives already ordered),
// and typing filters by name.
//
// On Today it also offers your recipes, in their own group above the
// foods, and the one search box filters both. Without recipes it looks
// exactly as before (no group headings).

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { basisLabel, macroText } from "@/lib/macros";
import type { Food, Recipe } from "@/lib/types";
import { OPTION_CLASS, RecipeOption } from "./recipe-option";

export function FoodPicker({
  foods,
  onPick,
  noteFor,
  recipes = [],
  onPickRecipe,
}: {
  foods: Food[];
  onPick: (food: Food) => void;
  /** An extra line under a food, like "In recipe · 150 g". */
  noteFor?: (food: Food) => string | null;
  /** Recipes to offer first (Today only), already in order. */
  recipes?: Recipe[];
  onPickRecipe?: (recipe: Recipe) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
  // Recipes show only when there's something to do with a tap.
  const grouped = recipes.length > 0 && onPickRecipe !== undefined;
  const recipeMatches = !grouped
    ? []
    : q
      ? recipes.filter((r) => r.name.toLowerCase().includes(q))
      : recipes;

  // Possible if you deleted every food but still have past days logged.
  if (foods.length === 0 && !grouped) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        You have no foods yet.{" "}
        <Link href="/foods" className="focus-ring rounded-sm font-medium text-primary">
          Add one on Foods
        </Link>
      </p>
    );
  }

  const search = grouped ? "Search recipes and foods" : "Search your foods";
  const heading = "px-2 pt-2 text-[13px] font-medium text-muted-foreground";

  return (
    <div className="space-y-3 pt-2">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={search}
        aria-label={search}
        autoComplete="off"
        className="h-11"
      />

      {matches.length === 0 && recipeMatches.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          Nothing called “{query.trim()}”.{" "}
          <Link href="/foods" className="focus-ring rounded-sm font-medium text-primary">
            Add it on Foods
          </Link>
        </p>
      ) : (
        <>
          {recipeMatches.length > 0 && onPickRecipe && (
            // (onPickRecipe is always set here; repeated so TypeScript knows.)
            <section aria-labelledby="picker-recipes">
              <h3 id="picker-recipes" className={heading}>
                Your recipes
              </h3>
              <ul className="divide-y divide-border">
                {recipeMatches.map((recipe) => (
                  <li key={recipe.id}>
                    <RecipeOption recipe={recipe} onPick={() => onPickRecipe(recipe)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {matches.length > 0 && (
            <section aria-labelledby={grouped ? "picker-foods" : undefined}>
              {grouped && (
                <h3 id="picker-foods" className={heading}>
                  Foods
                </h3>
              )}
              <ul className="divide-y divide-border">
                {matches.map((food) => {
                  const note = noteFor?.(food);
                  return (
                    <li key={food.id}>
                      <button type="button" onClick={() => onPick(food)} className={OPTION_CLASS}>
                        <span className="font-medium">{food.name}</span>
                        <span className="text-[13px] text-muted-foreground tabular-nums">
                          {macroText(food.kcal, "kcal")} ·{" "}
                          {macroText(food.protein_g, "g", "protein")} {basisLabel(food.unit)}
                        </span>
                        {note && (
                          <span className="text-[13px] font-medium text-primary tabular-nums">
                            {note}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
