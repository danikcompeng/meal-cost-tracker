import { describe, expect, it } from "vitest";
import {
  NO_SERVING,
  plural,
  servingAmount,
  servingChangeLine,
  servingForEntry,
  servingUpdate,
  servingFromOpenFoodFacts,
  servingOf,
  servingRule,
  servingsIn,
  servingsText,
  validateServing,
} from "./servings";

const bagel = { name: "bagel", amount: 80 };

describe("servingOf", () => {
  it("reads the two columns", () => {
    expect(servingOf({ unit: "g", serving_name: "bagel", serving_amount: 80 })).toEqual(bagel);
  });
  it("is null when either is missing, or for an each food", () => {
    expect(servingOf({ unit: "g", ...NO_SERVING })).toBeNull();
    expect(servingOf({ unit: "g", serving_name: "bagel", serving_amount: null })).toBeNull();
    expect(servingOf({ unit: "each", serving_name: "bagel", serving_amount: 80 })).toBeNull();
  });
});

describe("servingForEntry", () => {
  const oats = { id: "oats", unit: "g" as const, serving_name: "cup", serving_amount: 80 };
  it("offers the food's serving when the units match", () => {
    expect(servingForEntry({ food_id: "oats", unit: "g" }, [oats])).toEqual({ name: "cup", amount: 80 });
  });
  it("not for a deleted food, a recipe, or a food whose unit changed", () => {
    expect(servingForEntry({ food_id: null, unit: "g" }, [oats])).toBeNull();
    expect(servingForEntry({ food_id: "gone", unit: "g" }, [oats])).toBeNull();
    expect(servingForEntry({ food_id: "oats", unit: "ml" }, [oats])).toBeNull();
    expect(servingForEntry({ food_id: null, unit: "serving" }, [oats])).toBeNull();
  });
});

describe("words", () => {
  it("makes plurals", () => {
    expect(plural("bagel")).toBe("bagels");
    expect(plural("box")).toBe("boxes");
    expect(plural("patty")).toBe("patties");
    expect(plural("tray")).toBe("trays");
    expect(plural("slice of bread")).toBe("slices of bread");
    expect(plural("large egg")).toBe("large eggs");
  });
  it("writes counts: ½ and 1 are singular", () => {
    expect(servingsText(0.5, bagel)).toBe("½ bagel");
    expect(servingsText(1, bagel)).toBe("1 bagel");
    expect(servingsText(2, bagel)).toBe("2 bagels");
    expect(servingsText(1.5, bagel)).toBe("1.5 bagels");
  });
  it("writes the rule", () => {
    expect(servingRule(bagel, "g")).toBe("1 bagel = 80 g");
    expect(servingRule({ name: "bottle", amount: 500 }, "ml")).toBe("1 bottle = 500 ml");
  });
});

describe("amounts", () => {
  it("turns servings into the food's unit, to 2 decimals", () => {
    expect(servingAmount(0.5, bagel)).toBe(40);
    expect(servingAmount(2, bagel)).toBe(160);
    expect(servingAmount(0.5, { name: "can", amount: 142.25 })).toBe(71.13);
  });
  it("finds whole or half servings in an amount, and nothing else", () => {
    expect(servingsIn(160, bagel)).toBe(2);
    expect(servingsIn(40, bagel)).toBe(0.5);
    expect(servingsIn(120, bagel)).toBe(1.5);
    expect(servingsIn(100, bagel)).toBeNull();
    expect(servingsIn(10, bagel)).toBeNull();
    expect(servingsIn(284, { name: "can", amount: 142 })).toBe(2);
  });
});

describe("validateServing", () => {
  it("both blank is no serving", () => {
    expect(validateServing({ name: "", amount: "" }, "g")).toEqual({ ok: true, value: NO_SERVING });
  });
  it("saves a tidy name and the amount", () => {
    expect(validateServing({ name: "  slice  of bread ", amount: "28" }, "g")).toEqual({
      ok: true,
      value: { serving_name: "slice of bread", serving_amount: 28 },
    });
  });
  it("says which half is missing", () => {
    const noName = validateServing({ name: "", amount: "80" }, "g");
    expect(noName.ok || noName.fieldErrors.servingName).toBe("Name the serving, like bagel.");
    const noAmount = validateServing({ name: "bagel", amount: "" }, "g");
    expect(noAmount.ok || noAmount.fieldErrors.servingAmount).toBe("Enter how much one bagel is.");
  });
  it("refuses 0, too much, and text, each with its own message", () => {
    const message = (amount: string) => {
      const r = validateServing({ name: "bagel", amount }, "g");
      return r.ok ? null : r.fieldErrors.servingAmount;
    };
    expect(message("0")).toBe("Enter an amount above 0.");
    expect(message("20000")).toBe("That looks too big. Check the label.");
    expect(message("abc")).toBe("Enter a number, like 80.");
    // "1,500": 1.5 or 1500? Asked like every other number box.
    expect(message("1,500")).toMatch(/comma/i);
  });
  it("drops it for an each food", () => {
    expect(validateServing({ name: "bagel", amount: "80" }, "each")).toEqual({ ok: true, value: NO_SERVING });
  });
});

describe("servingFromOpenFoodFacts", () => {
  // Shapes copied from their replies (searched "bagel", 2026-11-23).
  it("reads a named serving", () => {
    expect(
      servingFromOpenFoodFacts({ serving_size: "1 Bagel (100 g)", serving_quantity: 100, serving_quantity_unit: "g" }, "g"),
    ).toEqual({ name: "bagel", amount: 100 });
    expect(
      servingFromOpenFoodFacts({ serving_size: "1 portion (95 g)", serving_quantity: "95", serving_quantity_unit: "g" }, "g"),
    ).toEqual({ name: "portion", amount: 95 });
    expect(
      servingFromOpenFoodFacts({ serving_size: "1 bottle (500 ml)", serving_quantity: 500, serving_quantity_unit: "ml" }, "ml"),
    ).toEqual({ name: "bottle", amount: 500 });
  });
  it("a bare weight is a plain serving", () => {
    expect(servingFromOpenFoodFacts({ serving_size: "85g", serving_quantity: 85, serving_quantity_unit: "g" }, "g")).toEqual({
      name: "serving",
      amount: 85,
    });
    expect(servingFromOpenFoodFacts({ serving_size: "90.0g" }, "g")).toEqual({ name: "serving", amount: 90 });
  });
  it("a count other than 1 isn't split up", () => {
    expect(servingFromOpenFoodFacts({ serving_size: "2 slices (56 g)" }, "g")).toEqual({ name: "serving", amount: 56 });
    expect(servingFromOpenFoodFacts({ serving_size: "1/4 cup (30 g)" }, "g")).toEqual({ name: "serving", amount: 30 });
  });
  it("missing stays missing: no weight, another unit, or nothing at all", () => {
    expect(servingFromOpenFoodFacts({}, "g")).toBeNull();
    expect(servingFromOpenFoodFacts({ serving_size: "1 bagel" }, "g")).toBeNull();
    expect(servingFromOpenFoodFacts({ serving_size: "1 glass (250 ml)" }, "g")).toBeNull();
    expect(servingFromOpenFoodFacts({ serving_size: "0 g" }, "g")).toBeNull();
    expect(servingFromOpenFoodFacts({ serving_size: "1 big bag (1,000 g)" }, "g")).toBeNull();
  });
  it("trusts only the g or ml written on the label, not their worked-out quantity", () => {
    // Their real reply: the label says 170 g, their unit field says ml.
    expect(
      servingFromOpenFoodFacts({ serving_size: "0.75 cup (170 g)", serving_quantity: 170, serving_quantity_unit: "ml" }, "g"),
    ).toEqual({ name: "serving", amount: 170 });
    // Ounces only: they may have converted it to grams; we don't.
    expect(
      servingFromOpenFoodFacts({ serving_size: "1 cup (8 oz)", serving_quantity: 227, serving_quantity_unit: "g" }, "g"),
    ).toBeNull();
  });
});

describe("Update existing", () => {
  const mine = { unit: "g" as const, serving_name: "bagel", serving_amount: 90 };
  const scan = { unit: "g" as const, serving_name: "bagel", serving_amount: 100 };
  it("keeps a serving you have, and says nothing", () => {
    expect(servingUpdate(mine, scan)).toBeNull();
    expect(servingChangeLine(mine, scan)).toBeNull();
    expect(servingUpdate(mine, { ...scan, ...NO_SERVING })).toBeNull();
  });
  it("fills one in where you had none, and says so", () => {
    const none = { unit: "g" as const, ...NO_SERVING };
    expect(servingUpdate(none, scan)).toEqual({ serving_name: "bagel", serving_amount: 100 });
    expect(servingChangeLine(none, scan)).toBe("Serving none → 1 bagel = 100 g");
  });
  it("replaces it when the unit changes, since it meant the other unit", () => {
    const drink = { unit: "ml" as const, ...NO_SERVING };
    expect(servingUpdate(mine, drink)).toEqual(NO_SERVING);
    expect(servingChangeLine(mine, drink)).toBe("Serving 1 bagel = 90 g → none");
  });
});
