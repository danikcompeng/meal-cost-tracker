import { describe, expect, it } from "vitest";
import { soundsLikeWater, waterForAmount, waterText, waterTotal } from "./hydration";

describe("soundsLikeWater", () => {
  it("is true for names with the word water in them, any case", () => {
    for (const name of ["Water", "tap water", "Sparkling Water", "Coconut water (Vita)"]) {
      expect(soundsLikeWater(name), name).toBe(true);
    }
  });

  it("is false for other names, including ones that only contain the letters", () => {
    for (const name of ["Watermelon", "Milk", "Waterloo crackers", ""]) {
      expect(soundsLikeWater(name), name).toBe(false);
    }
  });
});

describe("waterForAmount", () => {
  it("counts the amount for an ml food that's switched on", () => {
    expect(waterForAmount({ unit: "ml", counts_toward_hydration: true }, 250)).toBe(250);
  });

  it("adds 0 when the switch is off, or the food isn't measured in ml", () => {
    expect(waterForAmount({ unit: "ml", counts_toward_hydration: false }, 250)).toBe(0);
    // Can't happen (the database refuses it), but never count g as ml.
    expect(waterForAmount({ unit: "g", counts_toward_hydration: true }, 250)).toBe(0);
  });
});

describe("waterTotal", () => {
  it("adds up a day, and an empty day is 0", () => {
    expect(waterTotal([{ water_ml: 250 }, { water_ml: 0 }, { water_ml: 500 }])).toBe(750);
    expect(waterTotal([])).toBe(0);
  });
});

describe("waterText", () => {
  it("shows ml under 1,000 and litres from there, to 1 decimal", () => {
    expect(waterText(0)).toBe("0 ml");
    expect(waterText(750)).toBe("750 ml");
    expect(waterText(1000)).toBe("1 L");
    expect(waterText(1250)).toBe("1.3 L");
    // 999.6 ml would show as "1,000 ml": say 1 L instead.
    expect(waterText(999.6)).toBe("1 L");
  });

  it("shows <1 ml for a little that rounds down to 0", () => {
    expect(waterText(0.3)).toBe("<1 ml");
  });
});
