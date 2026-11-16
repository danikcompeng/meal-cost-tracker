import { Skeleton, TextLine, onPage, onTile } from "./skeleton";

// Grey shapes in the same places as the real screens, so nothing jumps
// around while your recipes load (shared pieces in skeleton.tsx).

/** The Recipes list: the "New recipe" button and a few tiles. */
export function RecipesSkeleton() {
  return (
    <Skeleton label="Loading your recipes…" className="space-y-3">
      <div className={`h-11 rounded-lg ${onPage}`} />
      {[0, 1, 2].map((i) => (
        // A recipe tile: name, ingredients and the cost line (91 px).
        <div key={i} className={`h-[91px] rounded-2xl ${onPage}`} />
      ))}
    </Skeleton>
  );
}

/**
 * One recipe, at the real heights (recipe-view, recipe-cost,
 * recipe-nutrients): back link and name, the big cost with its lines, the
 * Swap button, the nutrients tile, then the ingredients and their button.
 */
export function RecipeSkeleton() {
  return (
    <Skeleton label="Loading the recipe…">
      <div className="mb-8">
        <TextLine line="h-11" width="w-20" />
        <div className="flex h-11 items-center justify-between">
          <div className={`h-9 w-48 rounded-lg ${onPage}`} />
          <div className={`h-4 w-8 rounded ${onPage}`} />
        </div>
      </div>

      {/* Cost per serving: label, the 48 px number, "Makes 2 servings",
          protein per $. */}
      <TextLine line="h-5" bar="h-3" width="w-28" />
      <TextLine line="h-15" bar="h-12" width="w-32" />
      <TextLine width="w-48" />
      <TextLine line="mt-1 h-6" width="w-36" />

      <div className={`mt-4 h-11 rounded-lg ${onPage}`} />

      {/* Per serving: label, the four main numbers in two rows, the four
          small ones. */}
      <div className="mt-6 rounded-2xl bg-card p-4">
        <TextLine line="h-5" bar="h-3" width="w-20" shade={onTile} />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <TextLine line="h-7" bar="h-5" width="w-16" shade={onTile} />
              <TextLine line="h-5" bar="h-3" width="w-14" shade={onTile} />
            </div>
          ))}
        </div>
        {/* Sugar, fiber, sat fat, sodium: two lines on most phones. */}
        <TextLine line="mt-4 h-5" bar="h-3" width="w-56" shade={onTile} />
        <TextLine line="mt-1 h-5" bar="h-3" width="w-24" shade={onTile} />
      </div>

      <div className="mt-8">
        <TextLine line="mb-1 h-5 px-3" bar="h-3" width="w-24" />
        {[0, 1, 2].map((i) => (
          // An ingredient row: name and amount, then its macros (64 px).
          <div key={i} className={`h-16 rounded-lg ${onPage}`} />
        ))}
        <div className={`mt-2 h-11 rounded-lg ${onPage}`} />
      </div>
    </Skeleton>
  );
}
