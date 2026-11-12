"use client";

// "More nutrients": sugar, fiber, saturated fat and sodium, folded away
// under the main four so the form doesn't look like a nutrition label.
//
// The boxes stay in the page while folded (just hidden), because a form
// only sends the boxes that exist. If they were removed while folded,
// saving an edit would send nothing for them and wipe the saved values.
// `inert` keeps hidden boxes out of Tab and screen readers.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { NutrientInput } from "./nutrient-input";

export type ExtraField = "sugar" | "fiber" | "saturatedFat" | "sodium";

export const EXTRA_FIELDS: { key: ExtraField; label: string; suffix: string }[] = [
  { key: "sugar", label: "Sugar", suffix: "g" },
  { key: "fiber", label: "Fiber", suffix: "g" },
  { key: "saturatedFat", label: "Saturated fat", suffix: "g" },
  { key: "sodium", label: "Sodium", suffix: "mg" },
];

export function MoreNutrients({
  values,
  onChange,
  errors,
  placeholder,
  sodiumNote,
}: {
  values: Record<ExtraField, string>;
  onChange: (key: ExtraField, value: string) => void;
  errors: Partial<Record<string, string>>;
  placeholder: string;
  /** "Worked out from salt", while Sodium still holds that number. */
  sodiumNote: string | null;
}) {
  const [isOpen, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  // An error is never hidden: the section opens itself to show it, and
  // STAYS open. (Working "open" out from the error on every render would
  // snap it shut the moment you clear the wrong number to retype it,
  // taking the keyboard with it.) Setting state while rendering is allowed
  // in React when it's guarded like this, so it only happens once.
  const hasError = EXTRA_FIELDS.some(({ key }) => errors[key]);
  if (hasError && !isOpen) setOpen(true);
  const filled = EXTRA_FIELDS.filter(({ key }) => values[key].trim() !== "").length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="more-nutrients"
        className="flex h-11 w-full items-center justify-between gap-3 text-left"
      >
        <span className="font-medium">More nutrients</span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground tabular-nums">
          {filled === 0 ? "optional" : `${filled} of 4 filled`}
          <motion.span
            aria-hidden="true"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="inline-flex"
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </span>
      </button>

      {/* Height can't be skipped by Framer Motion's reduced-motion setting
          (it only skips movement like slides), so it's turned off here. */}
      <motion.div
        id="more-nutrients"
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        // The extra px-1 / -mx-1 leaves room for the focus ring, which
        // overflow-hidden would otherwise cut off at the sides.
        className="-mx-1 overflow-hidden"
        inert={!isOpen}
      >
        <div className="grid grid-cols-2 gap-3 px-1 pt-2 pb-1">
          {EXTRA_FIELDS.map(({ key, label, suffix }) => (
            <NutrientInput
              key={key}
              name={key}
              label={label}
              suffix={suffix}
              value={values[key]}
              onChange={(value) => onChange(key, value)}
              placeholder={placeholder}
              error={errors[key]}
              note={key === "sodium" ? sodiumNote : null}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
