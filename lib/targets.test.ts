import { describe, expect, it } from "vitest";
import {
  hasAnyTarget,
  kcalHeadline,
  lowCalorieNote,
  NO_TARGETS,
  ofTarget,
  progress,
  targetsHint,
  validateTargets,
} from "./targets";

describe("validateTargets", () => {
  it("treats blank boxes as no target, never 0", () => {
    expect(validateTargets({ kcal: "", protein: "  ", carbs: undefined, fat: null })).toEqual({
      ok: true,
      value: NO_TARGETS,
    });
  });

  it("accepts whole numbers", () => {
    expect(validateTargets({ kcal: "2000", protein: "140", carbs: "200", fat: "60" })).toEqual({
      ok: true,
      value: { daily_kcal: 2000, daily_protein_g: 140, daily_carbs_g: 200, daily_fat_g: 60 },
    });
  });

  it("rounds decimals to whole numbers", () => {
    const result = validateTargets({ kcal: "1999.5", protein: "140.4", carbs: "0,6" });
    expect(result.ok && result.value).toMatchObject({
      daily_kcal: 2000,
      daily_protein_g: 140,
      daily_carbs_g: 1,
    });
  });

  it("refuses 1,000 because it could mean 1000 or 1", () => {
    const result = validateTargets({ kcal: "2,000" });
    expect(!result.ok && result.fieldErrors.kcal).toMatch(/without a comma/);
  });

  it("refuses 0 kcal, including decimals that round to 0", () => {
    for (const kcal of ["0", "0.4"]) {
      const result = validateTargets({ kcal });
      expect(!result.ok && result.fieldErrors.kcal).toMatch(/can't be 0/);
    }
  });

  it("allows a 0 g macro target", () => {
    const result = validateTargets({ carbs: "0" });
    expect(result.ok && result.value.daily_carbs_g).toBe(0);
  });

  it("refuses words, negatives and numbers above the limits", () => {
    const result = validateTargets({ kcal: "10001", protein: "-5", carbs: "lots", fat: "1000.6" });
    expect(!result.ok && result.fieldErrors).toEqual({
      kcal: "That looks too high. The most is 10,000 kcal.",
      protein: "Enter a number, or leave it blank.",
      carbs: "Enter a number, or leave it blank.",
      fat: "That looks too high. The most is 1,000 g.",
    });
  });

  it("accepts the limits themselves", () => {
    const result = validateTargets({ kcal: "10000", protein: "1000" });
    expect(result.ok).toBe(true);
  });
});

describe("hasAnyTarget", () => {
  it("is false with nothing set and true with one target", () => {
    expect(hasAnyTarget(NO_TARGETS)).toBe(false);
    expect(hasAnyTarget({ ...NO_TARGETS, daily_fat_g: 0 })).toBe(true);
  });
});

describe("targetsHint", () => {
  const t = { daily_kcal: 2000, daily_protein_g: 140, daily_carbs_g: 200, daily_fat_g: 70 };

  it("stays quiet when macros roughly match (560 + 800 + 630 = 1,990)", () => {
    expect(targetsHint(t)).toBeNull();
  });

  it("stays quiet at a 20% gap or less", () => {
    // 4*100 + 4*150 + 9*80 = 1,720 kcal: 280 less, 14% of 2,000.
    expect(targetsHint({ ...t, daily_protein_g: 100, daily_carbs_g: 150, daily_fat_g: 80 })).toBe(
      null,
    );
  });

  it("draws the line exactly at 20%", () => {
    // 4 * 400 = 1,600 kcal: 400 less, exactly 20% of 2,000. No hint.
    const edge = { daily_kcal: 2000, daily_protein_g: 0, daily_carbs_g: 400, daily_fat_g: 0 };
    expect(targetsHint(edge)).toBeNull();
    // 4 * 399 = 1,596 kcal: 404 less, just over 20%. Hint.
    expect(targetsHint({ ...edge, daily_carbs_g: 399 })).toMatch(/1,596 kcal, 404 less/);
  });

  it("says how far off macros are when the gap is over 20%", () => {
    // 400 + 600 + 450 = 1,450 kcal, 550 less (27.5%).
    expect(targetsHint({ ...t, daily_protein_g: 100, daily_carbs_g: 150, daily_fat_g: 50 })).toBe(
      "Your macros add up to 1,450 kcal, 550 less than your calorie target.",
    );
    expect(targetsHint({ ...t, daily_kcal: 1500, daily_fat_g: 90 })).toBe(
      "Your macros add up to 2,170 kcal, 670 more than your calorie target.",
    );
  });

  it("needs all four targets", () => {
    expect(targetsHint({ ...t, daily_fat_g: null })).toBeNull();
  });
});

describe("lowCalorieNote", () => {
  it("shows under 1,200 kcal only", () => {
    expect(lowCalorieNote(1199)).toMatch(/doctor or dietitian/);
    expect(lowCalorieNote(1200)).toBeNull();
    expect(lowCalorieNote(null)).toBeNull();
  });
});

describe("progress", () => {
  it("is null with no target", () => {
    expect(progress({ sum: 500, missing: 0 }, null)).toBeNull();
  });

  it("works out what's left", () => {
    const p = progress({ sum: 1140, missing: 0 }, 2000)!;
    expect(p).toEqual({
      target: 2000,
      eaten: 1140,
      left: 860,
      over: false,
      reached: false,
      fraction: 0.57,
      incomplete: false,
    });
    expect(kcalHeadline(p)).toEqual({ prefix: null, number: "860", suffix: "kcal left" });
    expect(ofTarget({ sum: 1140, missing: 0 }, 2000)).toBe("1,140 of 2,000");
  });

  it("says 'up to' when a food is missing calories", () => {
    const p = progress({ sum: 1140, missing: 1 }, 2000)!;
    expect(kcalHeadline(p)).toEqual({ prefix: "up to", number: "860", suffix: "kcal left" });
  });

  it("counts all-unknown as nothing known, still 'up to'", () => {
    const p = progress({ sum: null, missing: 2 }, 2000)!;
    expect(p.eaten).toBe(0);
    expect(ofTarget({ sum: null, missing: 2 }, 2000)).toBe("— of 2,000");
    expect(kcalHeadline(p)).toEqual({ prefix: "up to", number: "2,000", suffix: "kcal left" });
  });

  it("says how far over, and keeps the bar full", () => {
    const p = progress({ sum: 2120, missing: 0 }, 2000)!;
    expect(p).toMatchObject({ over: true, reached: true, fraction: 1 });
    expect(kcalHeadline(p)).toEqual({ prefix: null, number: "120", suffix: "kcal over" });
    expect(kcalHeadline({ ...p, incomplete: true }).prefix).toBe("at least");
  });

  it("uses the rounded total, so 139.6 of 140 g counts as reached", () => {
    expect(progress({ sum: 139.6, missing: 0 }, 140)).toMatchObject({
      eaten: 140,
      left: 0,
      over: false,
      reached: true,
      fraction: 1,
    });
    expect(progress({ sum: 139.4, missing: 0 }, 140)!.reached).toBe(false);
  });

  it("treats a 0 g target as met and full", () => {
    expect(progress({ sum: 0, missing: 0 }, 0)).toMatchObject({ reached: true, fraction: 1 });
    expect(progress({ sum: 5, missing: 0 }, 0)).toMatchObject({ over: true, left: -5 });
  });
});
