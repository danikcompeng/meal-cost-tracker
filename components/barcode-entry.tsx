"use client";

// "Type the number": for when the camera is blocked, or a barcode won't
// scan (crumpled, curved or shiny packs). The digits under the lines are
// looked up exactly as if they'd been scanned.

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeBarcode } from "@/lib/barcode";
import { Field } from "./form-field";

export function BarcodeEntry({
  initial = "",
  backLabel,
  onBack,
  onSubmit,
  children,
}: {
  initial?: string;
  /** "Scan instead", or "Back" when the camera is blocked. */
  backLabel: string;
  onBack: () => void;
  onSubmit: (barcode: string) => void;
  /** The lookup status, shown under the input. */
  children?: React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const barcode = normalizeBarcode(value);
    if (!barcode) {
      setError("That doesn't look like a barcode. Check the digits under the lines, including the last one.");
      return;
    }
    setError(undefined);
    onSubmit(barcode);
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </button>
      <h1 className="mt-4 text-[30px] leading-tight font-bold">Type the barcode</h1>
      <p className="mt-2 text-muted-foreground">The 8 to 13 digits printed under the lines.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-card p-4" noValidate>
        <Field label="Barcode" htmlFor="barcode-number" error={error}>
          <Input
            id="barcode-number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            // A number keypad on phones. Not type="number": that would
            // drop leading zeros, and barcodes often start with 0.
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="5000112637922"
            className="h-11 bg-background tabular-nums md:text-base"
            aria-invalid={Boolean(error)}
          />
        </Field>
        <Button type="submit" className="h-11 w-full text-base">
          Look it up
        </Button>
      </form>

      {children && <div className="mt-6 rounded-2xl bg-card p-4">{children}</div>}
    </main>
  );
}
