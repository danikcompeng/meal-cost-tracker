"use client";

// The "Daily targets" tile on the Settings screen: four optional boxes
// (calories, protein, carbs, fat), then a Water section with the "Show
// water on Today" switch and the daily goal (2,000 ml to start).
// Both hints under the boxes are advice only and never stop you saving.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTargets, type TargetsFormState } from "@/lib/settings-actions";
import {
  DEFAULT_WATER_ML,
  lowCalorieNote,
  targetsHint,
  validateTargets,
  type Targets,
} from "@/lib/targets";
import { Field } from "./form-field";
import { SwitchRow } from "./switch-row";

/** Whether the goal box holds a goal that would save: 1 to 10,000 ml. */
function validWater(text: string): boolean {
  const result = validateTargets({ water: text });
  return result.ok || !result.fieldErrors.water;
}

type Key = "kcal" | "protein" | "carbs" | "fat" | "water";
type Fields = Record<Key, string>;

const FIELDS: { key: Key; label: string; suffix: string }[] = [
  { key: "kcal", label: "Calories", suffix: "kcal" },
  { key: "protein", label: "Protein", suffix: "g" },
  { key: "carbs", label: "Carbs", suffix: "g" },
  { key: "fat", label: "Fat", suffix: "g" },
];

// String(null) is "null", so "no target" has to become an empty box by hand.
const toField = (value: number | null) => (value === null ? "" : String(value));

function fieldsFrom(t: Targets): Fields {
  return {
    kcal: toField(t.daily_kcal),
    protein: toField(t.daily_protein_g),
    carbs: toField(t.daily_carbs_g),
    fat: toField(t.daily_fat_g),
    water: String(t.daily_water_ml),
  };
}

export function TargetsForm({ targets }: { targets: Targets }) {
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(targets));
  const [showWater, setShowWater] = useState(targets.show_water);
  // The last goal that was saved, to fall back on (see toggleWater).
  const [savedWater, setSavedWater] = useState(targets.daily_water_ml);
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
        setShowWater(result.saved.show_water);
        setSavedWater(result.saved.daily_water_ml);
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

  // While water is off, the goal box is hidden but still saved as it is,
  // so turning water back on brings your goal back. If the box held a
  // mistake (or was empty) when you switched off, you couldn't see its
  // error any more, so it goes back to the last saved goal instead.
  function toggleWater(on: boolean) {
    setShowWater(on);
    setJustSaved(false);
    if (!on && !validWater(fields.water)) {
      set("water", String(savedWater));
      // The box now holds a good goal, so the server's last water error
      // no longer applies (it would come back red when switched on).
      setWaterErrorFixed(state);
    }
  }
  // The server reply whose water error was fixed by toggleWater.
  const [waterErrorFixed, setWaterErrorFixed] = useState<TargetsFormState | null>(null);

  // Live advice while you type, from the same checks the server runs.
  // Water gets a stand-in goal here: retyping it shouldn't make the
  // calorie hints blink in and out.
  const preview = validateTargets({ ...fields, water: String(DEFAULT_WATER_ML) });
  const hints = preview.ok
    ? [targetsHint(preview.value), kcalFocused ? null : lowCalorieNote(preview.value.daily_kcal)].filter(Boolean)
    : [];
  const serverErrors = state.fieldErrors ?? {};
  const errors =
    waterErrorFixed === state ? { ...serverErrors, water: undefined } : serverErrors;

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

      {/* A fieldset, so screen readers say "Water" when you reach the
          switch or the goal box ("Daily goal" alone wouldn't say what for). */}
      <fieldset className="space-y-3">
        <legend className="mb-3 text-[13px] font-medium text-muted-foreground">Water</legend>
        <SwitchRow
          name="showWater"
          label="Show water on Today"
          checked={showWater}
          onChange={toggleWater}
        />
        {/* Hidden while off, but still sent, so the goal is kept. */}
        <div hidden={!showWater} className="w-1/2 pr-1.5">
          <Field label="Daily goal" htmlFor="water" error={errors.water}>
            <div className="relative">
              <Input
                id="water"
                name="water"
                value={fields.water}
                onChange={(e) => set("water", e.target.value)}
                inputMode="decimal"
                placeholder="2000"
                autoComplete="off"
                className="h-11 bg-background pr-12 tabular-nums md:text-base"
                aria-invalid={Boolean(errors.water)}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
              >
                ml
              </span>
            </div>
          </Field>
        </div>
      </fieldset>

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
