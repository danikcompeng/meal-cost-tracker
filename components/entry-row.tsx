import { macroText } from "@/lib/macros";
import type { MealEntry } from "@/lib/types";
import { amountText } from "@/lib/units";

// One thing you ate. Tap it to change the amount, move it or delete it.
//   Rolled oats                       568.5 kcal
//   150 g · 19.5 g protein
export function EntryRow({ entry, onOpen }: { entry: MealEntry; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-14 w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{entry.name}</span>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {amountText(entry.amount, entry.unit)} ·{" "}
          <span className={entry.protein_g === null ? undefined : "font-medium text-primary"}>
            {macroText(entry.protein_g, "g", "protein")}
          </span>
        </span>
      </span>
      <span
        className={
          entry.kcal === null
            ? "text-muted-foreground tabular-nums"
            : "whitespace-nowrap tabular-nums"
        }
      >
        {macroText(entry.kcal, "kcal")}
      </span>
    </button>
  );
}
