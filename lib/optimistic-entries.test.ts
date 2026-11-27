import { describe, expect, it } from "vitest";
import { swappedFrom } from "./entry-validation";
import { holdEntry } from "./held-entries";
import { NO_EXTRAS } from "./macros";
import { recipeSnapshotFor, scaleSnapshot, snapshotFor } from "./nutrition";
import {
  applyEntryChange,
  editedFields,
  loggedFood,
  loggedRecipe,
  swappedFields,
  unswappedFields,
} from "./optimistic-entries";
import { NO_SERVING } from "./servings";
import type { Food, MealEntry, Recipe } from "./types";

const oats: Food = {
  id: "oats",
  name: "Rolled oats",
  brand: null,
  barcode: null,
  price: 3.5,
  package_size: 500,
  unit: "g",
  kcal: 379,
  protein_g: 13,
  carbs_g: 60,
  fat_g: 7,
  ...NO_EXTRAS,
  counts_toward_hydration: false,
  ...NO_SERVING,
};

const porridge: Recipe = { id: "porridge", name: "Porridge", servings: 2, ingredients: [{ food: oats, amount: 160 }] };
const bigPorridge: Recipe = { ...porridge, id: "big", name: "Big porridge", ingredients: [{ food: oats, amount: 300 }] };

describe("the entry the phone shows is the one the server saves", () => {
  it("a food: the same snapshot the server works out, with the phone's id", () => {
    const entry = loggedFood("id-1", "2026-11-27", "breakfast", oats, 80);
    expect(entry).toEqual({
      id: "id-1",
      day: "2026-11-27",
      meal: "breakfast",
      food_id: "oats",
      recipe_id: null,
      ...snapshotFor(oats, 80),
    });
  });

  it("a recipe: per serving x servings, in servings", () => {
    const entry = loggedRecipe("id-2", "2026-11-27", "lunch", porridge, 1.5);
    expect(entry).toMatchObject({ recipe_id: "porridge", food_id: null, unit: "serving", amount: 1.5 });
    expect(entry.kcal).toBeCloseTo(recipeSnapshotFor(porridge, 1.5).kcal!);
  });

  it("editing scales the entry's own snapshot (never re-reads the food)", () => {
    const entry = loggedFood("id-1", "2026-11-27", "breakfast", oats, 80);
    expect(editedFields(entry, "snack", 160)).toEqual({
      meal: "snack",
      amount: 160,
      ...scaleSnapshot(entry, 80, 160),
    });
  });

  it("a swap keeps the servings and takes the new recipe's numbers", () => {
    const entry = loggedRecipe("id-2", "2026-11-27", "lunch", porridge, 1.5);
    const fields = swappedFields(entry, bigPorridge);
    expect(fields).toMatchObject({ recipe_id: "big", food_id: null, name: "Big porridge", amount: 1.5 });
    expect(fields.kcal).toBeCloseTo(recipeSnapshotFor(bigPorridge, 1.5).kcal!);
  });

  it("Undo of a swap puts back exactly the old copy", () => {
    const before = loggedRecipe("id-2", "2026-11-27", "lunch", porridge, 1.5);
    const after = { ...before, ...swappedFields(before, bigPorridge) };
    expect({ ...after, ...unswappedFields(swappedFrom(before)) }).toEqual(before);
  });
});

const entry = (id: string, meal: MealEntry["meal"] = "lunch") => ({ id, meal, name: id }) as MealEntry;
const ids = (list: MealEntry[]) => list.map((e) => e.id);

describe("applyEntryChange", () => {
  const a = entry("a", "breakfast");
  const b = entry("b");
  const c = entry("c");

  it("a new entry goes last, like the newest in the server's list", () => {
    expect(ids(applyEntryChange([a, b], { kind: "add", entry: c }))).toEqual(["a", "b", "c"]);
  });

  it("an entry that's back from Undo goes where it was", () => {
    const spot = holdEntry([a, b, c], b);
    expect(ids(applyEntryChange([a, c], { kind: "add", entry: b, spot }))).toEqual(["a", "b", "c"]);
  });

  it("never shows an entry twice when the server's copy is already there", () => {
    expect(ids(applyEntryChange([a, b], { kind: "add", entry: b }))).toEqual(["a", "b"]);
  });

  it("changes only the entry it names, in its place", () => {
    const list = applyEntryChange([a, b, c], { kind: "change", id: "b", fields: { name: "Dal", meal: "dinner" } });
    expect(ids(list)).toEqual(["a", "b", "c"]);
    expect(list[1]).toMatchObject({ name: "Dal", meal: "dinner" });
    expect(list[0]).toBe(a);
  });

  it("a change for an entry that's gone does nothing", () => {
    expect(applyEntryChange([a], { kind: "change", id: "zz", fields: { name: "x" } })).toEqual([a]);
  });

  it("never changes the list it was given", () => {
    const list = [a, b];
    applyEntryChange(list, { kind: "add", entry: c });
    applyEntryChange(list, { kind: "change", id: "a", fields: { name: "x" } });
    expect(list).toEqual([a, b]);
    expect(a.name).toBe("a");
  });
});
