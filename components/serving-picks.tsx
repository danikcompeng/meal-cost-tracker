import { parseDecimal } from "@/lib/numbers";
import { plural, SERVING_PICKS, servingAmount, servingsText, type Serving } from "@/lib/servings";
import { amountText, type BaseUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

// One-tap amounts for a food with a serving: "½ bagel · 40 g",
// "1 bagel · 80 g", "2 bagels · 160 g". A tap writes the grams into the
// amount box (you can still type any amount). What's saved is always the
// grams, never "2 bagels".
// The pick matching the box is shown selected (butter yellow, like the
// other selected pills).
export function ServingPicks({
  serving,
  unit,
  value,
  onPick,
}: {
  serving: Serving;
  unit: BaseUnit;
  /** What's in the amount box now. */
  value: string;
  onPick: (amount: string) => void;
}) {
  const typed = parseDecimal(value);
  return (
    <div role="group" aria-label={`Quick amounts in ${plural(serving.name)}`} className="flex flex-wrap gap-2">
      {SERVING_PICKS.map((count) => {
        const amount = servingAmount(count, serving);
        const selected = typed === amount;
        return (
          <button
            key={count}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(String(amount))}
            className={cn(
              // min-h, not h: a long name ("slice of sourdough bread")
              // wraps onto a second line inside the pill instead of spilling.
              "focus-ring press min-h-11 rounded-full px-3.5 py-2 text-sm font-medium tabular-nums",
              selected ? "bg-highlight text-highlight-foreground" : "bg-card hover:bg-accent",
            )}
          >
            {servingsText(count, serving)}
            <span className={selected ? undefined : "text-muted-foreground"}> · {amountText(amount, unit)}</span>
          </button>
        );
      })}
    </div>
  );
}
