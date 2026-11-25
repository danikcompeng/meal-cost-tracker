import type { DisplayUnit } from "@/lib/format";
import { waterText } from "@/lib/hydration";
import { macroText, type Nutrients } from "@/lib/macros";
import { missingNotes, recipeTotals } from "@/lib/recipe-totals";
import type { Recipe } from "@/lib/types";

const MAIN = [
  { key: "kcal", unit: "kcal", word: "calories" },
  { key: "protein_g", unit: "g", word: "protein" },
  { key: "carbs_g", unit: "g", word: "carbs" },
  { key: "fat_g", unit: "g", word: "fat" },
] as const satisfies readonly { key: keyof Nutrients; unit: string; word: string }[];

const EXTRAS = [
  { key: "sugar_g", unit: "g", word: "sugar", label: "Sugar" },
  { key: "fiber_g", unit: "g", word: "fiber", label: "Fiber" },
  { key: "saturated_fat_g", unit: "g", word: "sat fat", label: "Sat fat" },
  { key: "sodium_mg", unit: "mg", word: "sodium", label: "Sodium" },
] as const satisfies readonly { key: keyof Nutrients; unit: string; word: string; label: string }[];

// "Per serving": the main four big enough to read at a glance, the other
// four small and quiet underneath. Any "—" gets a grey line saying which
// ingredient is missing it, so you know what to fix.
export function RecipeNutrients({ recipe }: { recipe: Recipe }) {
  const { per, water } = recipeTotals(recipe);
  const notes = missingNotes(recipe.ingredients, [...MAIN, ...EXTRAS]);

  return (
    <section aria-labelledby="per-serving" className="mt-6 rounded-2xl bg-card p-5">
      <h2 id="per-serving" className="text-label font-medium text-muted-foreground">
        Per serving
      </h2>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {MAIN.map(({ key, unit, word }) => (
          // The word comes first in the code (dt before dd, the order
          // screen readers expect); flex-col-reverse shows the number on top.
          <div key={key} className="flex flex-col-reverse">
            <dt className="text-label text-muted-foreground">{word}</dt>
            <dd
              className={
                per[key] === null
                  ? "text-xl text-muted-foreground tabular-nums"
                  : key === "protein_g"
                    ? "text-xl font-medium text-primary tabular-nums"
                    : "text-xl font-medium tabular-nums"
              }
            >
              {valueText(per[key], unit)}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-label text-muted-foreground tabular-nums">
        {EXTRAS.map(({ key, unit, label }) => (
          <div key={key} className="flex gap-1 whitespace-nowrap">
            <dt>{label}</dt>
            <dd>{valueText(per[key], unit)}</dd>
          </div>
        ))}
        {/* Only when an ingredient counts toward hydration (say, water in
            overnight oats). Never unknown, so no dash. */}
        {water > 0 && (
          <div className="flex gap-1 whitespace-nowrap">
            <dt>Water</dt>
            <dd>{waterText(water)}</dd>
          </div>
        )}
      </dl>

      {notes.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-label text-muted-foreground">
          {notes.map((note) => (
            <li key={note}>Unknown because {note}.</li>
          ))}
        </ul>
      )}
    </section>
  );
}

// "412 kcal", "24 g", "4.5 g", or a dash (with words for screen readers).
function valueText(value: number | null, unit: DisplayUnit) {
  if (value === null) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">unknown</span>
      </>
    );
  }
  return macroText(value, unit);
}
