import { Label } from "@/components/ui/label";

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
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
