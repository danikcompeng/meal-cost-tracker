"use client";

// "Delete recipe", at the bottom of the Edit recipe sheet. It asks first.
// Days you logged it keep their numbers: those are copies (snapshots).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { keepOnFailure } from "@/lib/action-call";
import { deleteRecipe } from "@/lib/recipe-actions";

export function DeleteRecipe({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [deleting, startDelete] = useTransition();

  function handleDelete() {
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
      {error && <p className="text-sm text-destructive">{error}</p>}
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
          type="button"
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="h-11 w-full text-base text-destructive"
        >
          Delete recipe
        </Button>
      )}
    </div>
  );
}
