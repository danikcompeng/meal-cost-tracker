import { Input } from "@/components/ui/input";
import { Field } from "./form-field";

// One number box with its unit inside on the right: "13   g".
// Used for the main four and for "More nutrients".
export function NutrientInput({
  name,
  label,
  suffix,
  value,
  onChange,
  placeholder,
  error,
  invalid,
  labelClassName,
  note,
}: {
  name: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  /** Red outline without its own message (e.g. the "adds up to" error). */
  invalid?: boolean;
  labelClassName?: string;
  /** A small grey line under the box, like "Converted from kJ". */
  note?: string | null;
}) {
  return (
    <Field label={label} htmlFor={name} error={error} labelClassName={labelClassName}>
      <div className="relative">
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          className="h-11 bg-background pr-12 tabular-nums md:text-base"
          aria-invalid={Boolean(error) || invalid}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
        >
          {suffix}
        </span>
      </div>
      {note && <p className="text-[13px] text-muted-foreground">{note}</p>}
    </Field>
  );
}
