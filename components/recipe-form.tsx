"use client";

// A recipe's name and how many servings it makes. Used for "New recipe"
// and for "Edit recipe". The boxes are controlled (kept in state) so a
// mistake doesn't wipe what you typed: React clears uncontrolled boxes
// after a form action runs.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRecipe, updateRecipe } from "@/lib/recipe-actions";
import type { FormState } from "@/lib/types";
import { unitWordForTyped } from "@/lib/units";
import { Field } from "./form-field";

export function RecipeForm({
  recipe,
  onDone,
}: {
  /** Leave out for a new recipe. */
  recipe?: { id: string; name: string; servings: number };
  /** After saving. A new recipe passes its id. */
  onDone: (id?: string) => void;
}) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [servings, setServings] = useState(recipe ? String(recipe.servings) : "1");

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await (recipe ? updateRecipe : createRecipe)(prev, formData);
      if (result.ok) onDone(result.id);
      return result;
    },
    { ok: false },
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5 pt-2" noValidate>
      {recipe && <input type="hidden" name="id" value={recipe.id} />}

      <Field label="Name" htmlFor="recipe-name" error={errors.name}>
        <Input
          id="recipe-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Overnight oats"
          autoComplete="off"
          autoFocus={!recipe}
          className="h-11"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <Field label="Makes" htmlFor="recipe-servings" error={errors.servings}>
        <div className="relative">
          <Input
            id="recipe-servings"
            name="servings"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            className="h-11 pr-24 tabular-nums"
            aria-invalid={Boolean(errors.servings)}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          >
            {/* "Makes 1 serving", "Makes 4 servings". */}
            {unitWordForTyped(servings, "serving")}
          </span>
        </div>
      </Field>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {recipe ? (pending ? "Saving…" : "Save changes") : pending ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}
