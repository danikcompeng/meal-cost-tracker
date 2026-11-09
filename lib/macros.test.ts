import { describe, expect, it } from "vitest";
import {
  basisAmount,
  basisChangeNote,
  basisLabel,
  calorieHint,
  fillZeroKcalMacros,
  hasAnyMacro,
  macroText,
  zeroKcalFillsBlanks,
} from "./macros";

const none = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };

describe("basisAmount and basisLabel", () => {
  it("is 100 for g and ml, 1 for each", () => {
    expect(basisAmount("g")).toBe(100);
    expect(basisAmount("ml")).toBe(100);
    expect(basisAmount("each")).toBe(1);
  });

  it("reads naturally", () => {
    expect(basisLabel("g")).toBe("per 100 g");
    expect(basisLabel("ml")).toBe("per 100 ml");
    expect(basisLabel("each")).toBe("per 1 item");
  });
});

describe("macroText", () => {
  it("shows the amount, unit and label", () => {
    expect(macroText(13, "g", "protein")).toBe("13 g protein");
    expect(macroText(350, "kcal")).toBe("350 kcal");
    expect(macroText(12.5, "g", "fat")).toBe("12.5 g fat");
  });

  it("shows a missing value as — and keeps its label", () => {
    expect(macroText(null, "g", "protein")).toBe("— protein");
    expect(macroText(null, "kcal")).toBe("— kcal");
  });

  it("shows a real 0 as 0, not —", () => {
    expect(macroText(0, "g", "fat")).toBe("0 g fat");
  });
});

describe("hasAnyMacro", () => {
  it("is false only when every macro is missing", () => {
    expect(hasAnyMacro(none)).toBe(false);
    expect(hasAnyMacro({ ...none, fat_g: 0 })).toBe(true);
  });
});

describe("calorieHint", () => {
  it("stays quiet when calories match the macros", () => {
    // Oats: 4*13 + 4*60 + 9*7 = 355, label says 379 (fiber etc.): within 20%.
    expect(calorieHint({ kcal: 379, protein_g: 13, carbs_g: 60, fat_g: 7 })).toBeNull();
  });

  it("flags calories that look too high", () => {
    // A typo: 3790 instead of 379.
    const hint = calorieHint({ kcal: 3790, protein_g: 13, carbs_g: 60, fat_g: 7 });
    expect(hint).toMatch(/high/);
    expect(hint).toMatch(/355/);
  });

  it("flags calories that look too low", () => {
    expect(calorieHint({ kcal: 38, protein_g: 13, carbs_g: 60, fat_g: 7 })).toMatch(/low/);
  });

  it("ignores small gaps on low-calorie foods", () => {
    // Lettuce-like: 4*1 + 4*6 + 9*0 = 28, label 36. 22% off, but only 8 kcal.
    expect(calorieHint({ kcal: 36, protein_g: 1, carbs_g: 6, fat_g: 0 })).toBeNull();
  });

  it("measures the 20% against the larger number", () => {
    // 20 g protein = 80 kcal expected. 100 kcal is a gap of 20, which is
    // exactly 20% of 100: no hint. 101 is a gap of 21, over 20% of 101.
    const protein = { protein_g: 20, carbs_g: 0, fat_g: 0 };
    expect(calorieHint({ kcal: 100, ...protein })).toBeNull();
    expect(calorieHint({ kcal: 101, ...protein })).toMatch(/high/);
  });

  it("flags 0 kcal with a macro above 0, even with blanks left", () => {
    // These blanks are NOT filled with 0, so the hint explains the clash.
    expect(calorieHint({ kcal: 0, protein_g: 5, carbs_g: null, fat_g: null })).toMatch(
      /0 kcal doesn't fit/,
    );
    expect(calorieHint({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })).toBeNull();
  });

  it("says nothing until all four numbers are filled in", () => {
    expect(calorieHint({ kcal: 3790, protein_g: 13, carbs_g: 60, fat_g: null })).toBeNull();
    expect(calorieHint(none)).toBeNull();
  });
});

describe("basisChangeNote", () => {
  it("warns when the unit changes after macros were entered", () => {
    const note = basisChangeNote(["g", "g", "g", "g"], "each");
    expect(note).toMatch(/per 100 g/);
    expect(note).toMatch(/per 1 item/);
  });

  it("also warns for g -> ml (100 ml isn't 100 g)", () => {
    expect(basisChangeNote(["g"], "ml")).toBeTruthy();
  });

  it("keeps warning until every filled macro is re-checked", () => {
    // Switched g -> each, then fixed only Calories: three are still per 100 g.
    expect(basisChangeNote(["each", "g", "g", "g"], "each")).toMatch(/per 100 g/);
    expect(basisChangeNote(["each", "each", "each", "each"], "each")).toBeNull();
  });

  it("stays quiet when the unit is unchanged", () => {
    expect(basisChangeNote(["g", "g"], "g")).toBeNull();
  });

  it("stays quiet when no macros are filled in", () => {
    expect(basisChangeNote([], "each")).toBeNull();
  });

  it("goes away if you switch back to the original unit", () => {
    expect(basisChangeNote(["g", "g"], "g")).toBeNull();
  });
});

describe("fillZeroKcalMacros", () => {
  it("fills blank macros with 0 when kcal is 0", () => {
    expect(fillZeroKcalMacros({ ...none, kcal: 0 })).toEqual({
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });
  });

  it("leaves everything else exactly as it was", () => {
    const contradicting = { kcal: 0, protein_g: 5, carbs_g: null, fat_g: null };
    expect(fillZeroKcalMacros(contradicting)).toBe(contradicting);
    expect(fillZeroKcalMacros(none)).toBe(none);
    const someKcal = { ...none, kcal: 12 };
    expect(fillZeroKcalMacros(someKcal)).toBe(someKcal);
  });

  it("zeroKcalFillsBlanks is false when there's nothing blank to fill", () => {
    expect(zeroKcalFillsBlanks({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })).toBe(false);
    expect(zeroKcalFillsBlanks({ ...none, kcal: 0 })).toBe(true);
  });
});
