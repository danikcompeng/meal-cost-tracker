import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unitWordForTyped, type EntryUnit } from "@/lib/units";

// The amount box with its unit written inside on the right ("150  g").
// For a recipe it's "Servings", with "servings" inside ("1.5  servings").
// The word follows what you type: "1  serving", "2  servings".
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
  const placeholder = unit === "each" || unit === "serving" ? 1 : 150;
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
          placeholder={String(placeholder)}
          autoComplete="off"
          autoFocus={autoFocus}
          className={`h-11 tabular-nums md:text-base ${unit === "serving" ? "pr-24" : "pr-16"}`}
          aria-invalid={Boolean(error)}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
        >
          {/* An empty box shows the grey placeholder, so "1  serving". */}
          {unitWordForTyped(value, unit, placeholder)}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
