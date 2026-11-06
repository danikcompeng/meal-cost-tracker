"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveIngredient } from "@/lib/ingredient-actions";
import { validateIngredient } from "@/lib/ingredient-validation";
import { unitPriceLabel } from "@/lib/cost";
import { INPUT_UNITS, type InputUnit } from "@/lib/units";
import type { FormState, Ingredient } from "@/lib/types";

type Fields = { name: string; price: string; packageSize: string; unit: InputUnit };

const EMPTY: Fields = { name: "", price: "", packageSize: "", unit: "g" };

function fieldsFrom(ingredient: Ingredient | null): Fields {
  if (!ingredient) return EMPTY;
  return {
    name: ingredient.name,
    price: String(ingredient.price),
    packageSize: String(ingredient.package_size),
    unit: ingredient.unit,
  };
}

export function IngredientForm({
  editing,
  onDone,
}: {
  editing: Ingredient | null;
  onDone: () => void;
}) {
  // "Controlled" inputs: React holds the values, so we can show a live
  // price preview and keep what you typed if saving fails.
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(editing));

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await saveIngredient(prev, formData);
      if (result.ok) {
        setFields(EMPTY);
        onDone();
      }
      return result;
    },
    { ok: false },
  );

  const set = (key: keyof Fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const preview = validateIngredient(fields);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input
          id="name"
          name="name"
          value={fields.name}
          onChange={set("name")}
          placeholder="Rolled oats"
          autoComplete="off"
          className="h-11"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <Field label="Price paid" htmlFor="price" error={errors.price}>
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
            className="h-11 pl-7"
            aria-invalid={Boolean(errors.price)}
          />
        </div>
      </Field>

      <Field label="Package size" htmlFor="packageSize" error={errors.packageSize ?? errors.unit}>
        <div className="flex gap-2">
          <Input
            id="packageSize"
            name="packageSize"
            value={fields.packageSize}
            onChange={set("packageSize")}
            inputMode="decimal"
            placeholder="500"
            className="h-11 flex-1"
            aria-invalid={Boolean(errors.packageSize)}
          />
          <select
            name="unit"
            aria-label="Unit"
            value={fields.unit}
            onChange={set("unit")}
            className="h-11 w-24 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {INPUT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <p className="h-5 text-sm text-muted-foreground" aria-live="polite">
        {preview.ok &&
          `= ${unitPriceLabel(preview.value.price, preview.value.package_size, preview.value.unit)}`}
      </p>

      {state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11 flex-1">
          {pending ? "Saving…" : editing ? "Save changes" : "Add ingredient"}
        </Button>
        {editing && (
          <Button type="button" variant="ghost" onClick={onDone} className="h-11">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
