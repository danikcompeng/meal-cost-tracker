"use client";

// A row of options where exactly one is picked, like iOS's segmented control.
// Under the hood it's ordinary radio buttons (visually hidden), so keyboards
// and screen readers already know how to use it: arrow keys move between
// options, and it's announced as "radio, 1 of 3".
// Reused later for the Day / Week switch.

import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-label font-medium text-muted-foreground">{label}</legend>
      {/* White track, so it stands out on a grey tile. Options are 44px
          tall: the size phones recommend for a comfortable tap. */}
      <div className="flex rounded-lg border border-border bg-background p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              // Corners concentric with the track's (CLAUDE.md, Layout):
              // 10 px − 1 px border − 4 px padding = 5 px.
              "flex h-11 flex-1 cursor-pointer items-center justify-center rounded-[calc(var(--radius-lg)-5px)] text-base transition-colors",
              // Keyboard focus ring, shown on the label because the real
              // radio button is hidden (focus-ring-within, globals.css).
              // Outside the label, in the track's 4 px padding, so it's on
              // white, never on the butter yellow of the selected option.
              "focus-ring-within",
              option.value === value
                ? "bg-highlight font-medium text-highlight-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
