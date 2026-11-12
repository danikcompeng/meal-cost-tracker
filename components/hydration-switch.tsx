"use client";

// "Counts toward hydration" on ml foods. See switch-row.tsx for how the
// switch itself works.

import { SwitchRow } from "./switch-row";

export function HydrationSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <SwitchRow
      name="countsTowardHydration"
      label="Counts toward hydration"
      description="Adds what you log to your water for the day"
      checked={checked}
      onChange={onChange}
    />
  );
}
