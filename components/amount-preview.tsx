import { formatMoney } from "@/lib/cost";
import { macroText, type Macros } from "@/lib/macros";

// The live line under the amount box: "= 568.5 kcal · 19.5 g protein · $1.05".
// Missing values show "—"; a food with no price says "no price yet".
export function AmountPreview({
  values,
}: {
  values: (Macros & { cost: number | null }) | null;
}) {
  return (
    <p className="min-h-5 text-sm text-muted-foreground tabular-nums" aria-live="polite">
      {values && (
        <>
          = {macroText(values.kcal, "kcal")} ·{" "}
          <span className={values.protein_g === null ? undefined : "font-medium text-primary"}>
            {macroText(values.protein_g, "g", "protein")}
          </span>{" "}
          · {values.cost === null ? "no price yet" : formatMoney(values.cost)}
        </>
      )}
    </p>
  );
}
