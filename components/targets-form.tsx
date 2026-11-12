"use client";

// The "Daily targets" tile on the Settings screen: five optional boxes
// (calories, protein, carbs, fat and a water goal).
// Both hints under the boxes are advice only and never stop you saving.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTargets, type TargetsFormState } from "@/lib/settings-actions";
import { lowCalorieNote, targetsHint, validateTargets, type Targets } from "@/lib/targets";
import { Field } from "./form-field";

type Key = "kcal" | "protein" | "carbs" | "fat" | "water";
type Fields = Record<Key, string>;

const FIELDS: { key: Key; label: string; suffix: string }[] = [
  { key: "kcal", label: "Calories", suffix: "kcal" },
  { key: "protein", label: "Protein", suffix: "g" },
  { key: "carbs", label: "Carbs", suffix: "g" },
  { key: "fat", label: "Fat", suffix: "g" },
  { key: "water", label: "Water", suffix: "ml" },
];

// String(null) is "null", so "no target" has to become an empty box by hand.
const toField = (value: number | null) => (value === null ? "" : String(value));

function fieldsFrom(t: Targets): Fields {
  return {
    kcal: toField(t.daily_kcal),
    protein: toField(t.daily_protein_g),
    carbs: toField(t.daily_carbs_g),
    fat: toField(t.daily_fat_g),
    water: toField(t.daily_water_ml),
  };
}

export function TargetsForm({ targets }: { targets: Targets }) {
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(targets));
  // "Saved" shows after saving, until you change something again.
  const [justSaved, setJustSaved] = useState(false);
  // While you type "2000" the box passes through 2, 20 and 200. The
  // low-calorie note waits until you leave the box, so it never flashes up
  // for a normal target.
  const [kcalFocused, setKcalFocused] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: TargetsFormState, formData: FormData) => {
      const result = await saveTargets(prev, formData);
      if (result.ok && result.saved) {
        // Show what was really saved: 140.6 becomes 141.
        setFields(fieldsFrom(result.saved));
        setJustSaved(true);
      }
      return result;
    },
    { ok: false },
  );

  function set(key: Key, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setJustSaved(false);
  }

  // Live advice while you type, from the same checks the server runs.
  const preview = validateTargets(fields);
  const hints = preview.ok
    ? [targetsHint(preview.value), kcalFocused ? null : lowCalorieNote(preview.value.daily_kcal)].filter(Boolean)
    : [];
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby="targets-label"
      className="space-y-5 rounded-2xl bg-card p-4"
    >
      <div>
        <h2 id="targets-label" className="text-[13px] font-medium text-muted-foreground">
          Daily targets
        </h2>
        <p className="mt-1">Leave any blank for no target.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, suffix }) => (
          <Field
            key={key}
            label={label}
            htmlFor={key}
            error={errors[key]}
            labelClassName={key === "protein" ? "text-primary" : undefined}
          >
            <div className="relative">
              <Input
                id={key}
                name={key}
                value={fields[key]}
                onChange={(e) => set(key, e.target.value)}
                onFocus={key === "kcal" ? () => setKcalFocused(true) : undefined}
                onBlur={key === "kcal" ? () => setKcalFocused(false) : undefined}
                inputMode="decimal"
                placeholder="optional"
                autoComplete="off"
                className="h-11 bg-background pr-12 tabular-nums md:text-base"
                aria-invalid={Boolean(errors[key])}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
              >
                {suffix}
              </span>
            </div>
          </Field>
        ))}
      </div>

      {/* Soft advice only: it never stops you saving. */}
      <div className="min-h-5 space-y-2 text-sm text-muted-foreground" aria-live="polite">
        {hints.map((hint) => (
          <p key={hint}>{hint}</p>
        ))}
      </div>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Saving…" : "Save targets"}
      </Button>
      <p role="status" className="min-h-5 text-center text-sm text-muted-foreground">
        {justSaved && !pending ? "Saved" : ""}
      </p>
    </form>
  );
}
