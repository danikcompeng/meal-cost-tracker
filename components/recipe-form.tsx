"use client";

// A recipe's name and how many servings it makes. Used for "New recipe"
// and for "Edit recipe". The boxes are controlled (kept in state) so a
// mistake doesn't wipe what you typed: React clears uncontrolled boxes
// after a form action runs.

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { keepOnFailure, refreshIfReachable, tapAgain } from "@/lib/action-call";
import { createRecipe, updateRecipe } from "@/lib/recipe-actions";
import type { FormState } from "@/lib/types";
import { unitWordForTyped } from "@/lib/units";
import { Field, errorId } from "./form-field";
import { useFocusFirstInvalid } from "./use-focus-first-invalid";

export function RecipeForm({
  recipe,
  onDone,
}: {
  /** Leave out for a new recipe. */
  recipe?: { id: string; name: string; servings: number };
  /** After saving. A new recipe passes its id. */
  onDone: (id?: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(recipe?.name ?? "");
  const [servings, setServings] = useState(recipe ? String(recipe.servings) : "1");

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      // Offline: a message here, and what you typed stays. A new recipe
      // may have been created anyway if the connection dropped on the
      // way, so the list behind reloads and the message says to check it.
      const result = recipe
        ? await keepOnFailure(updateRecipe, tapAgain("save", "Save changes"))(prev, formData)
        : await keepOnFailure(
            createRecipe,
            tapAgain("create it", "Create", "Check your recipes"),
            () => void refreshIfReachable(() => router.refresh()),
          )(prev, formData);
      if (result.ok) onDone(result.id);
      return result;
    },
    { ok: false },
  );
  const errors = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  return (
    <form ref={formRef} action={formAction} className="space-y-5 pt-2" noValidate>
      {recipe && <input type="hidden" name="id" value={recipe.id} />}

      <Field label="Name" htmlFor="recipe-name" error={errors.name}>
        <Input
          id="recipe-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Overnight oats"
          autoComplete="off"
          // "New recipe" opens straight onto this box, so the sheet focuses
          // it once it's open (data-autofocus, see bottom-sheet.tsx).
          data-autofocus={!recipe || undefined}
          className="h-11"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? errorId("recipe-name") : undefined}
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
            aria-describedby={errors.servings ? errorId("recipe-servings") : undefined}
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

      {/* Read out as soon as it appears; hidden while trying again so a
          second failure with the same words still shows. */}
      {!pending && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      {/* Keeps keyboard focus while it works. */}
      <Button type="submit" disabled={pending} focusableWhenDisabled className="press-wide h-11 w-full text-base">
        {recipe ? (pending ? "Saving…" : "Save changes") : pending ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}
