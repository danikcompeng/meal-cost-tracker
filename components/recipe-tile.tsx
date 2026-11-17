import Link from "next/link";
import { formatMoney, proteinPerDollarText } from "@/lib/cost";
import { macroText } from "@/lib/macros";
import { recipeTotals } from "@/lib/recipe-totals";
import type { Recipe } from "@/lib/types";
import { amountText } from "@/lib/units";

// One recipe in the list. Tap it to open the recipe.
//   Overnight oats                           $1.12
//   412 kcal · 24 g protein              per serving
//   21 g protein per $ · 4 servings
export function RecipeTile({ recipe }: { recipe: Recipe }) {
  const empty = recipe.ingredients.length === 0;
  const { cost, per, proteinPerDollar: ppd } = recipeTotals(recipe);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="focus-ring flex flex-col gap-0.5 rounded-2xl bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{recipe.name}</span>
        {!empty && (
          <span className="font-medium whitespace-nowrap tabular-nums">
            {cost === null ? (
              // A bare "—" may be read as nothing by screen readers.
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">cost unknown</span>
              </>
            ) : (
              formatMoney(cost)
            )}
          </span>
        )}
      </span>

      {empty ? (
        <span className="text-label text-muted-foreground">No ingredients yet</span>
      ) : (
        <>
          <span className="flex items-baseline justify-between gap-3 text-label text-muted-foreground tabular-nums">
            <span>
              {macroText(per.kcal, "kcal")} ·{" "}
              <span className={per.protein_g === null ? undefined : "font-medium text-primary"}>
                {macroText(per.protein_g, "g", "protein")}
              </span>
            </span>
            <span className="whitespace-nowrap">{cost === null ? "no price yet" : "per serving"}</span>
          </span>
          <span className="text-label text-muted-foreground tabular-nums">
            {ppd !== null && (
              <>
                <span className="font-medium text-primary">{proteinPerDollarText(ppd)}</span> ·{" "}
              </>
            )}
            {amountText(recipe.servings, "serving")}
          </span>
        </>
      )}
    </Link>
  );
}
