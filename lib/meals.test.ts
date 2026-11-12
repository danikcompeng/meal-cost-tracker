import { describe, expect, it } from "vitest";
import { mealForHour } from "./meals";

describe("mealForHour", () => {
  it("picks a meal for the time of day", () => {
    expect(mealForHour(7)).toBe("breakfast");
    expect(mealForHour(12)).toBe("lunch");
    expect(mealForHour(19)).toBe("dinner");
  });

  it("uses the edges as written in the comment", () => {
    expect(mealForHour(4)).toBe("breakfast");
    expect(mealForHour(10)).toBe("breakfast");
    expect(mealForHour(11)).toBe("lunch");
    expect(mealForHour(14)).toBe("lunch");
    expect(mealForHour(17)).toBe("dinner");
    expect(mealForHour(21)).toBe("dinner");
  });

  it("calls everything in between a snack", () => {
    expect(mealForHour(15)).toBe("snack");
    expect(mealForHour(23)).toBe("snack");
    expect(mealForHour(2)).toBe("snack");
  });
});
