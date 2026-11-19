import { costOfAmount, formatMoney } from "@/lib/cost";
import { macroText } from "@/lib/macros";
import { nutrientsForAmount } from "@/lib/nutrition";
import type { RecipeIngredient } from "@/lib/types";
import { amountText } from "@/lib/units";

// One ingredient, for the WHOLE recipe (what goes in the pot), not per
// serving. Tap it to change the amount or remove it.
//   Rolled oats                               $0.74
//   150 g · 19.5 g protein
export function IngredientRow({
  ingredient,
  onOpen,
}: {
  ingredient: RecipeIngredient;
  onOpen: () => void;
}) {
  const { food, amount } = ingredient;
  const protein = nutrientsForAmount(food, amount).protein_g;
  const cost = costOfAmount(food.price, food.package_size, amount);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="focus-ring press-wide flex min-h-14 w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{food.name}</span>
        <span className="text-label text-muted-foreground tabular-nums">
          {amountText(amount, food.unit)} ·{" "}
          <span className={protein === null ? undefined : "font-medium text-primary"}>
            {macroText(protein, "g", "protein")}
          </span>
        </span>
      </span>
      {cost === null ? (
        <span className="text-label whitespace-nowrap text-muted-foreground">no price yet</span>
      ) : (
        <span className="whitespace-nowrap tabular-nums">{formatMoney(cost)}</span>
      )}
    </button>
  );
}
