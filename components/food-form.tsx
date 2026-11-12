"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./form-field";
import { SegmentedControl } from "./segmented-control";
import { saveFood } from "@/lib/food-actions";
import { validateFood, validateMacros } from "@/lib/food-validation";
import { unitPriceLabel } from "@/lib/cost";
import { basisChangeNote, basisLabel, calorieHint, type Macros } from "@/lib/macros";
import type { FoodDraft } from "@/lib/food-draft";
import { missingMacros, missingNote } from "@/lib/open-food-facts";
import { inputUnitsFor, toBaseUnit, type BaseUnit, type InputUnit } from "@/lib/units";
import type { FormState, Food } from "@/lib/types";
import { cn } from "@/lib/utils";

type MacroKey = "kcal" | "protein" | "carbs" | "fat";

type Fields = Record<MacroKey, string> & {
  name: string;
  brand: string;
  price: string;
  packageSize: string;
  unit: InputUnit;
};

const EMPTY: Fields = {
  name: "",
  brand: "",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
  price: "",
  packageSize: "",
  unit: "g",
};

const MEASURED_BY = [
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "each", label: "each" },
] as const;

const MACRO_FIELDS: { key: MacroKey; label: string; suffix: string }[] = [
  { key: "kcal", label: "Calories", suffix: "kcal" },
  { key: "protein", label: "Protein", suffix: "g" },
  { key: "carbs", label: "Carbs", suffix: "g" },
  { key: "fat", label: "Fat", suffix: "g" },
];

// String(null) is "null", so a missing macro has to become "" by hand,
// or the edit form would show the word "null" in the box.
const toField = (value: number | null) => (value === null ? "" : String(value));

// A saved food's (or a scan's) macros were all entered for its unit.
function macroUnitsFrom(food: Macros & { unit: BaseUnit }): Partial<Record<MacroKey, BaseUnit>> {
  const saved = { kcal: food.kcal, protein: food.protein_g, carbs: food.carbs_g, fat: food.fat_g };
  return Object.fromEntries(
    Object.entries(saved)
      .filter(([, value]) => value !== null)
      .map(([key]) => [key, food.unit]),
  );
}

// Numbers from a scan, as text for the boxes. The price is always blank:
// only you know what you paid.
function fieldsFromDraft(draft: FoodDraft): Fields {
  return {
    name: draft.name ?? "",
    brand: draft.brand ?? "",
    kcal: toField(draft.kcal),
    protein: toField(draft.protein_g),
    carbs: toField(draft.carbs_g),
    fat: toField(draft.fat_g),
    price: "",
    packageSize: toField(draft.packageSize),
    unit: draft.unit,
  };
}

function fieldsFrom(food: Food | null): Fields {
  if (!food) return EMPTY;
  return {
    name: food.name,
    brand: food.brand ?? "",
    kcal: toField(food.kcal),
    protein: toField(food.protein_g),
    carbs: toField(food.carbs_g),
    fat: toField(food.fat_g),
    price: String(food.price),
    packageSize: String(food.package_size),
    unit: food.unit,
  };
}

export function FoodForm({
  editing,
  draft,
  submitLabel,
  onDone,
}: {
  editing: Food | null;
  /** A scanned food to start from (only when adding, not editing). */
  draft?: FoodDraft;
  /** Overrides "Add food", e.g. "Save and log" after a scan. */
  submitLabel?: string;
  /** Called after saving, with the saved food's id. */
  onDone: (id?: string) => void;
}) {
  // "Controlled" inputs: React holds the values, so we can show live
  // previews and keep what you typed if saving fails.
  const [fields, setFields] = useState<Fields>(() =>
    draft ? fieldsFromDraft(draft) : fieldsFrom(editing),
  );

  // Which unit each macro on screen was typed for. If you then switch the
  // unit, we can warn that those numbers now mean something else. A scan's
  // numbers belong to the scan's unit (per 100 g or per 100 ml).
  const [macroUnits, setMacroUnits] = useState<Partial<Record<MacroKey, BaseUnit>>>(() => {
    if (editing) return macroUnitsFrom(editing);
    if (draft) return macroUnitsFrom(draft);
    return {};
  });

  const fromOpenFoodFacts = draft?.source === "open_food_facts";
  // Shown while Calories still holds the converted number. If you type
  // your own, the note no longer applies.
  const convertedKcal = draft?.kcalFromKj ? toField(draft.kcal) : null;
  const barcode = editing?.barcode ?? draft?.barcode ?? null;

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await saveFood(prev, formData);
      if (result.ok) {
        setFields(EMPTY);
        setMacroUnits({});
        onDone(result.id);
      }
      return result;
    },
    { ok: false },
  );

  const measuredBy = toBaseUnit(1, fields.unit).unit;

  const set = (key: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  function setMacro(key: MacroKey, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    // Typing in a box means you've looked at that number for the current unit.
    setMacroUnits((units) => ({ ...units, [key]: measuredBy }));
  }

  // Switching g/ml/each resets the package unit to the matching base (kg
  // only makes sense for g foods, and so on).
  function setMeasuredBy(unit: BaseUnit) {
    setFields((f) => ({ ...f, unit }));
  }

  // Only boxes with a number in them count; an empty box can't be wrong.
  const filledUnits = MACRO_FIELDS.filter(({ key }) => fields[key].trim() !== "").map(
    ({ key }) => macroUnits[key] ?? measuredBy,
  );
  const unitNote = basisChangeNote(filledUnits, measuredBy);
  const macros = validateMacros(fields, measuredBy);
  const hint = macros.filledBlanks
    ? "Blank macros will be saved as 0 g, since 0 kcal means none."
    : calorieHint(macros.value);
  const preview = validateFood(fields);
  // Numbers from Open Food Facts can be wrong (say, 120 g protein per
  // 100 g), so their mistakes show straight away, not only after Save.
  const errors = {
    ...(fromOpenFoodFacts ? macros.fieldErrors : {}),
    ...(state.fieldErrors ?? {}),
  };
  const missing = draft && fromOpenFoodFacts ? missingNote(missingMacros(draft)) : null;

  return (
    <form action={formAction} className="space-y-6 rounded-2xl bg-card p-4" noValidate>
      {editing && <input type="hidden" name="id" value={editing.id} />}
      {/* The package unit select below is the one the server reads. */}
      <input type="hidden" name="unit" value={fields.unit} />
      {/* Kept as they are: the barcode you scanned, and how it was added. */}
      <input type="hidden" name="barcode" value={barcode ?? ""} />
      {draft && <input type="hidden" name="source" value={draft.source} />}

      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input
          id="name"
          name="name"
          value={fields.name}
          onChange={set("name")}
          placeholder="Rolled oats"
          autoComplete="off"
          className="h-11 bg-background md:text-base"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <Field label="Brand" htmlFor="brand" error={errors.brand}>
        <Input
          id="brand"
          name="brand"
          value={fields.brand}
          onChange={set("brand")}
          placeholder="optional"
          autoComplete="off"
          className="h-11 bg-background md:text-base"
          aria-invalid={Boolean(errors.brand)}
        />
      </Field>

      {barcode && (
        <p className="-mt-3 text-[13px] text-muted-foreground tabular-nums">Barcode {barcode}</p>
      )}
      {errors.barcode && <p className="-mt-3 text-sm text-destructive">{errors.barcode}</p>}

      <SegmentedControl
        name="measuredBy"
        label="Measured by"
        options={MEASURED_BY}
        value={measuredBy}
        onChange={setMeasuredBy}
      />

      <fieldset className="space-y-3">
        <legend className="mb-3 text-[13px] font-medium text-muted-foreground">
          Nutrition {basisLabel(measuredBy)}
        </legend>

        {unitNote && (
          <p
            role="status"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
          >
            {unitNote}
          </p>
        )}

        {missing && (
          <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {missing}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {MACRO_FIELDS.map(({ key, label, suffix }) => (
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
                  onChange={(e) => setMacro(key, e.target.value)}
                  inputMode="decimal"
                  // After a scan, a blank box means "they didn't have it",
                  // not "you can skip this".
                  placeholder={fromOpenFoodFacts ? "not listed" : "optional"}
                  className="h-11 bg-background pr-12 tabular-nums md:text-base"
                  aria-invalid={Boolean(errors[key] ?? errors.macros)}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  {suffix}
                </span>
              </div>
              {key === "kcal" && convertedKcal !== null && fields.kcal === convertedKcal && (
                <p className="text-[13px] text-muted-foreground">Converted from kJ</p>
              )}
            </Field>
          ))}
        </div>

        {errors.macros && <p className="text-sm text-destructive">{errors.macros}</p>}
        {/* A soft hint only: it never stops you saving. */}
        <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
          {hint}
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-[13px] font-medium text-muted-foreground">
          What you paid
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price" htmlFor="price" error={errors.price}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                name="price"
                value={fields.price}
                onChange={set("price")}
                inputMode="decimal"
                placeholder="3.49"
                className="h-11 bg-background pl-7 tabular-nums md:text-base"
                aria-invalid={Boolean(errors.price)}
                // After a scan the rest is filled in; the price is what's left.
                autoFocus={fromOpenFoodFacts}
              />
            </div>
          </Field>

          <Field
            label="Package size"
            htmlFor="packageSize"
            error={errors.packageSize ?? errors.unit}
          >
            <div className="flex">
              <Input
                id="packageSize"
                name="packageSize"
                value={fields.packageSize}
                onChange={set("packageSize")}
                inputMode="decimal"
                placeholder="500"
                className={cn(
                  "h-11 min-w-0 flex-1 bg-background tabular-nums md:text-base",
                  measuredBy !== "each" && "rounded-r-none",
                )}
                aria-invalid={Boolean(errors.packageSize)}
              />
              {measuredBy === "each" ? null : (
                <select
                  aria-label="Package unit"
                  value={fields.unit}
                  onChange={set("unit")}
                  className="h-11 rounded-r-lg border border-l-0 border-input bg-background px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {inputUnitsFor(measuredBy).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Field>
        </div>
        <p className="min-h-5 text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {preview.ok &&
            `= ${unitPriceLabel(preview.value.price, preview.value.package_size, preview.value.unit)}`}
        </p>
      </fieldset>

      {state.message && (
        <p className="text-sm text-destructive">
          {state.message}{" "}
          {state.existingId && (
            <Link href={`/?log=${state.existingId}`} className="font-medium text-primary">
              Log that one
            </Link>
          )}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11 flex-1 text-base">
          {pending ? "Saving…" : editing ? "Save changes" : (submitLabel ?? "Add food")}
        </Button>
        {editing && (
          <Button type="button" variant="ghost" onClick={() => onDone()} className="h-11 text-base">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
