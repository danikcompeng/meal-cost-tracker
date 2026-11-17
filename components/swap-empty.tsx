"use client";

// What the swap sheet shows instead of cards: nothing to swap to yet, or
// you've seen every card.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * No cards at all. "none": this is your only recipe. "no-ingredients":
 * you have others, but none has ingredients, so nothing can be compared.
 */
export function SwapEmpty({ kind }: { kind: "none" | "no-ingredients" }) {
  return (
    // Like the cards: one step lighter than the sheet in dark mode
    // (surface-raised), with a quiet border.
    <section className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
      <h3 className="text-lg font-semibold">
        {kind === "none" ? "Swaps come from your own recipes" : "Nothing to compare yet"}
      </h3>
      <p className="mx-auto mt-2 max-w-xs text-muted-foreground">
        {kind === "none"
          ? "Add another staple meal and it'll show up here, matched on protein and price."
          : "Your other recipes don't have ingredients yet, so there's nothing to compare."}
      </p>
      <Link href="/recipes" className={cn(buttonVariants(), "mt-6 h-11 px-6 text-base")}>
        {kind === "none" ? "New recipe" : "Go to recipes"}
      </Link>
    </section>
  );
}

/**
 * After the last card: same size as a card, dashed, so it reads as "the
 * end of the pile". Focus moves to "Start over", because the button you
 * were on (Skip) has just gone.
 */
export function SwapEnd({
  count,
  currentName,
  onRestart,
  onKeep,
}: {
  count: number;
  currentName: string;
  onRestart: () => void;
  onKeep: () => void;
}) {
  const restartRef = useRef<HTMLButtonElement>(null);
  useEffect(() => restartRef.current?.focus(), []);

  const all = count === 1 ? "That's your only other recipe." : `That's all ${count} of your other recipes.`;
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border px-5 py-8 text-center">
      <h3 className="text-lg font-semibold tabular-nums">{all}</h3>
      <div className="mt-6 flex w-full flex-col gap-3">
        <Button ref={restartRef} variant="outline" onClick={onRestart} className="h-12 text-base">
          Start over
        </Button>
        <Button onClick={onKeep} className="h-12 text-base">
          {/* A long recipe name is cut short ("Keep Overnight oa…"), not
              pushed off the side of the button. */}
          <span className="min-w-0 truncate">Keep {currentName}</span>
        </Button>
      </div>
      <Link
        href="/recipes"
        className="focus-ring mt-4 flex h-11 items-center rounded-md text-sm font-medium text-primary"
      >
        New recipe
      </Link>
    </section>
  );
}
