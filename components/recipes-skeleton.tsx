// Grey shapes in the same places as the real screens, so nothing jumps
// around while your recipes load. The pulse is skipped if you've asked
// your phone for reduced motion (motion-safe).

const shape = "bg-card motion-safe:animate-pulse";

/** The Recipes list: the "New recipe" button and a few tiles. */
export function RecipesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your recipes" className="space-y-3">
      <div className={`h-11 rounded-lg ${shape}`} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-[88px] rounded-2xl ${shape}`} />
      ))}
    </div>
  );
}

/** One recipe: name, the big cost, the nutrients tile and ingredients. */
export function RecipeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the recipe">
      <div className="mb-8 space-y-3">
        <div className={`h-5 w-20 rounded-lg ${shape}`} />
        <div className={`h-9 w-48 rounded-lg ${shape}`} />
      </div>
      <div className={`h-4 w-28 rounded ${shape}`} />
      <div className={`mt-2 h-12 w-32 rounded-lg ${shape}`} />
      <div className={`mt-6 h-40 rounded-2xl ${shape}`} />
      <div className="mt-8 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-14 rounded-lg ${shape}`} />
        ))}
      </div>
    </div>
  );
}
