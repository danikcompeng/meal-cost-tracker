import { describe, expect, it } from "vitest";
import { dayTotals } from "./day-totals";
import { NO_EXTRAS } from "./macros";
import { costLine, showsWater, summarySlots } from "./summary";
import { NO_TARGETS } from "./targets";

const entry = {
  kcal: 500,
  protein_g: 30,
  carbs_g: 60,
  fat_g: 10,
  ...NO_EXTRAS,
  cost: 1.2,
};
const targets = {
  daily_kcal: 2000,
  daily_protein_g: 140,
  daily_carbs_g: 200,
  daily_fat_g: 30,
  daily_water_ml: 2000,
};

describe("summarySlots", () => {
  it("today with targets: a ring per slot, what's eaten as the short number", () => {
    const slots = summarySlots(dayTotals([entry, entry]), 1250, targets, true, true);
    expect(slots.map((s) => s.key)).toEqual(["protein", "carbs", "fat", "water"]);
    expect(slots[0]).toMatchObject({ short: "60 g", detail: "60 of 140 g", reached: false });
    expect(slots[0].fraction).toBeCloseTo(60 / 140, 10);
    expect(slots[3]).toMatchObject({ short: "1.3 L", detail: "1,250 of 2,000 ml", fraction: 0.625 });
  });

  it("past days get no rings, and details without 'of'", () => {
    const slots = summarySlots(dayTotals([entry]), 500, targets, false, true);
    expect(slots.every((s) => s.fraction === null)).toBe(true);
    expect(slots[0].detail).toBe("30 g");
    expect(slots[3].detail).toBe("500 ml");
  });

  it("a blank target means no ring for that slot only", () => {
    const slots = summarySlots(dayTotals([entry]), 0, { ...targets, daily_carbs_g: null }, true, false);
    expect(slots.map((s) => s.fraction === null)).toEqual([false, true, false]);
  });

  it("over target: the ring stays full; only protein says Goal reached", () => {
    const slots = summarySlots(dayTotals([entry, entry, entry, entry, entry]), 0, targets, true, false);
    expect(slots[0]).toMatchObject({ reached: true, fraction: 1 }); // 150 of 140 g
    expect(slots[2]).toMatchObject({ reached: false, fraction: 1 }); // 50 of 30 g fat
  });

  it("counts unknowns, and shows — when nothing is known", () => {
    const totals = dayTotals([entry, { ...entry, protein_g: null }, { ...entry, fat_g: null }]);
    const slots = summarySlots(totals, 0, NO_TARGETS, true, false);
    // Three foods, one without protein: 30 + 30 known, 1 unknown.
    expect(slots[0]).toMatchObject({ missing: 1, short: "60 g" });
    const none = summarySlots(dayTotals([{ ...entry, carbs_g: null }]), 0, NO_TARGETS, true, false);
    expect(none[1]).toMatchObject({ known: false, short: "—", detail: "—", missing: 0 });
  });

  it("leaves water out when it isn't shown", () => {
    expect(summarySlots(dayTotals([]), 0, targets, true, false)).toHaveLength(3);
  });
});

describe("showsWater", () => {
  it("shows water with a goal, a hydrating food, or water logged", () => {
    expect(showsWater({ ...NO_TARGETS, daily_water_ml: 2000 }, false, 0)).toBe(true);
    expect(showsWater(NO_TARGETS, true, 0)).toBe(true);
    expect(showsWater(NO_TARGETS, false, 250)).toBe(true);
  });

  it("hides it until you start using hydration", () => {
    expect(showsWater(NO_TARGETS, false, 0)).toBe(false);
  });
});

describe("costLine", () => {
  it("says what the day costs", () => {
    expect(costLine({ sum: 7.62, missing: 0 }, true)).toBe("Today costs $7.62");
    expect(costLine({ sum: 7.62, missing: 0 }, false)).toBe("This day cost $7.62");
  });

  it("says 'at least' when a food has no price, since the total can only be higher", () => {
    expect(costLine({ sum: 7.62, missing: 1 }, true)).toBe("Today costs at least $7.62");
  });

  it("says so when no food has a price", () => {
    expect(costLine({ sum: null, missing: 2 }, true)).toBe("No prices yet for these foods");
  });
});
