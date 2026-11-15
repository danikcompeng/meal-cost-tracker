import { formatMoney, proteinPerDollarText } from "@/lib/cost";
import { ingredientsMissing, missingSentence, recipeTotals } from "@/lib/recipe-totals";
import type { Recipe } from "@/lib/types";
import { amountText } from "@/lib/units";

// The one big number on the recipe screen: cost per serving.
//   Cost per serving
//   $1.12
//   Makes 4 servings · $4.48 in total
//   21 g protein per $
// Unknown cost: a big "—" and who's missing a price, never a lower number.
export function RecipeCost({ recipe }: { recipe: Recipe }) {
  const { ingredients, servings } = recipe;
  const empty = ingredients.length === 0;
  const { cost, proteinPerDollar: ppd } = recipeTotals(recipe);
  const noPrice = missingSentence(ingredientsMissing(ingredients, "cost"), "no price yet");

  return (
    <section aria-labelledby="cost-label">
      <h2 id="cost-label" className="text-[13px] font-medium text-muted-foreground">
        Cost per serving
      </h2>
      <p className="text-5xl leading-tight font-bold text-primary tabular-nums">
        {cost === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">unknown</span>
          </>
        ) : (
          formatMoney(cost)
        )}
      </p>

      {empty ? (
        <p className="text-muted-foreground">Add an ingredient to see the cost.</p>
      ) : (
        <p className="text-muted-foreground tabular-nums">
          Makes {amountText(servings, "serving")}
          {cost !== null && ` · ${formatMoney(cost * servings)} in total`}
        </p>
      )}
      {noPrice && <p className="text-[13px] text-muted-foreground">{noPrice}.</p>}
      {ppd !== null && (
        <p className="mt-1 font-medium text-primary tabular-nums">{proteinPerDollarText(ppd)}</p>
      )}
    </section>
  );
}
