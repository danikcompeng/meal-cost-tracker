"use client";

// "Delete recipe", at the bottom of the Edit recipe sheet. It asks first.
// Days you logged it keep their numbers: those are copies (snapshots).

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { keepOnFailure } from "@/lib/action-call";
import { deleteRecipe } from "@/lib/recipe-actions";
import { ErrorLine } from "./collapse";

export function DeleteRecipe({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [deleting, startDelete] = useTransition();

  // A failed delete swaps "Yes, delete" back for "Delete recipe": focus
  // goes there instead of falling out to the page.
  const deleteRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (error && document.activeElement === document.body) deleteRef.current?.focus();
  }, [error]);

  function handleDelete() {
    setError(undefined);
    startDelete(async () => {
      const result = await keepOnFailure(deleteRecipe, {
        verb: "delete it",
        retry: "delete it again",
      })(recipeId);
      // replace, not push: "back" shouldn't return to a deleted recipe.
      if (result.ok) router.replace("/recipes");
      else {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Read out as soon as it appears; opens its space smoothly. */}
      <ErrorLine show={Boolean(error)} gap="2">
        {error}
      </ErrorLine>
      {confirming ? (
        <div className="space-y-2 text-center">
          <p className="text-sm">
            Delete this recipe? Days you logged it keep their numbers.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              // Keeps keyboard focus while it works.
              focusableWhenDisabled
              className="h-11 px-4 text-base"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
              className="h-11 text-base"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          ref={deleteRef}
          type="button"
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="press-wide h-11 w-full text-base text-destructive"
        >
          Delete recipe
        </Button>
      )}
    </div>
  );
}
