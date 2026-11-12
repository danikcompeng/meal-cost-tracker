"use client";

// "Counts toward hydration": an on/off switch for ml foods.
//
// It's a real <button role="switch">, so screen readers say "Counts toward
// hydration, switch, on" and Space or Enter flips it. The whole row is the
// button (44 px tall), so the words are tappable too, not only the knob.
// The form sends its value through a hidden input, because a button's
// on/off state isn't part of a form by itself.

import { cn } from "@/lib/utils";

export function HydrationSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <>
      <input type="hidden" name="countsTowardHydration" value={checked ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 w-full items-center justify-between gap-3 py-1 text-left"
      >
        <span>
          <span className="block font-medium">Counts toward hydration</span>
          <span className="block text-[13px] text-muted-foreground">
            Adds what you log to your water for the day
          </span>
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
              "size-5 rounded-full shadow-sm transition-transform motion-reduce:transition-none",
              checked ? "translate-x-6 bg-primary-foreground" : "translate-x-1 bg-muted-foreground",
            )}
          />
        </span>
      </button>
    </>
  );
}
