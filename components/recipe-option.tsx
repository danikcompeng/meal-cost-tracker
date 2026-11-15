import { formatMoney } from "@/lib/cost";
import { macroText } from "@/lib/macros";
import { recipeTotals } from "@/lib/recipe-totals";
import type { Recipe } from "@/lib/types";

/** One tappable row in the picker, shared by recipes and foods so they match. */
export const OPTION_CLASS =
  "flex min-h-14 w-full flex-col items-start justify-center rounded-lg px-2 py-2 text-left hover:bg-accent";

// One recipe in Today's "Add to lunch" list, with one serving's numbers.
//   Overnight oats
//   412 kcal · 24 g protein · $1.12 per serving
export function RecipeOption({ recipe, onPick }: { recipe: Recipe; onPick: () => void }) {
  const { per, cost } = recipeTotals(recipe);
  return (
    <button type="button" onClick={onPick} className={OPTION_CLASS}>
      <span className="font-medium">{recipe.name}</span>
      <span className="text-[13px] text-muted-foreground tabular-nums">
        {macroText(per.kcal, "kcal")} ·{" "}
        <span className={per.protein_g === null ? undefined : "font-medium text-primary"}>
          {macroText(per.protein_g, "g", "protein")}
        </span>{" "}
        · {cost === null ? "no price yet" : `${formatMoney(cost)} per serving`}
      </span>
    </button>
  );
}
