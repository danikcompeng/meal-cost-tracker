import { Label } from "@/components/ui/label";

/**
 * The id of a field's error line, so its box can point at it:
 * aria-describedby={error ? errorId("price") : undefined}. Then a screen
 * reader reads "Type a price" together with the box, not just a red
 * outline nobody can hear.
 */
export function errorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}

/** A label, the input you pass in, and its error message underneath. */
export function Field({
  label,
  htmlFor,
  error,
  labelClassName,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  labelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
      </Label>
      {children}
      {error && (
        <p id={errorId(htmlFor)} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
