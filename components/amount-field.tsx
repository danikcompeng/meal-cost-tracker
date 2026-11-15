import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EntryUnit } from "@/lib/units";

const SUFFIX: Record<EntryUnit, string> = { g: "g", ml: "ml", each: "items", serving: "servings" };

// The amount box with its unit written inside on the right ("150  g").
// For a recipe it's "Servings", with "servings" inside ("1.5  servings").
export function AmountField({
  unit,
  value,
  onChange,
  error,
  autoFocus,
}: {
  unit: EntryUnit;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="amount">{unit === "serving" ? "Servings" : "Amount"}</Label>
      <div className="relative">
        <Input
          id="amount"
          name="amount"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder={unit === "each" || unit === "serving" ? "1" : "150"}
          autoComplete="off"
          autoFocus={autoFocus}
          className={`h-11 tabular-nums md:text-base ${unit === "serving" ? "pr-24" : "pr-16"}`}
          aria-invalid={Boolean(error)}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
        >
          {SUFFIX[unit]}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
