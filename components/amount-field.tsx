import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BaseUnit } from "@/lib/units";

// The amount box with its unit written inside on the right ("150  g").
export function AmountField({
  unit,
  value,
  onChange,
  error,
  autoFocus,
}: {
  unit: BaseUnit;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="amount">Amount</Label>
      <div className="relative">
        <Input
          id="amount"
          name="amount"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder={unit === "each" ? "1" : "150"}
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-11 pr-16 tabular-nums md:text-base"
          aria-invalid={Boolean(error)}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
        >
          {unit === "each" ? "items" : unit}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
