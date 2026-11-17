"use client";

// An on/off switch with its words, used for "Counts toward hydration" on
// foods and "Show water on Today" in Settings.
//
// It's a real <button role="switch">, so screen readers say "Show water on
// Today, switch, on" and Space or Enter flips it. The whole row is the
// button (at least 44 px tall), so the words are tappable too, not only
// the knob. The form gets its value from a hidden input, because a
// button's on/off state isn't part of a form by itself.

import { cn } from "@/lib/utils";

export function SwitchRow({
  name,
  label,
  description,
  checked,
  onChange,
}: {
  /** The form field the value is sent as: "true" or "false". */
  name: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-md py-1 text-left"
      >
        <span>
          <span className="block font-medium">{label}</span>
          {description && (
            <span className="block text-label text-muted-foreground">{description}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors motion-reduce:transition-none",
            checked ? "border-primary bg-primary" : "border-border bg-background",
          )}
        >
          <span
            className={cn(
              // No shadow in dark mode (depth there comes from lighter
              // surfaces, and a shadow on near-black doesn't show).
              "size-5 rounded-full shadow-sm transition-transform motion-reduce:transition-none dark:shadow-none",
              checked ? "translate-x-6 bg-primary-foreground" : "translate-x-1 bg-muted-foreground",
            )}
          />
        </span>
      </button>
    </>
  );
}
