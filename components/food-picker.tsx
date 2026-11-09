"use client";

// Step 1 of logging: pick one of YOUR foods. Recently logged foods are at
// the top (the list arrives already ordered), and typing filters by name.

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { basisLabel, macroText } from "@/lib/macros";
import type { Food } from "@/lib/types";

export function FoodPicker({ foods, onPick }: { foods: Food[]; onPick: (food: Food) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;

  // Possible if you deleted every food but still have past days logged.
  if (foods.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        You have no foods yet.{" "}
        <Link href="/foods" className="font-medium text-primary">
          Add one on Foods
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your foods"
        aria-label="Search your foods"
        autoComplete="off"
        className="h-11 md:text-base"
      />

      {matches.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          No food called “{query.trim()}”.{" "}
          <Link href="/foods" className="font-medium text-primary">
            Add it on Foods
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {matches.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => onPick(food)}
                className="flex min-h-14 w-full flex-col items-start justify-center rounded-lg px-2 py-2 text-left hover:bg-accent"
              >
                <span className="font-medium">{food.name}</span>
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {macroText(food.kcal, "kcal")} · {macroText(food.protein_g, "g", "protein")}{" "}
                  {basisLabel(food.unit)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
