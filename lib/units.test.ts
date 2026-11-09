import { describe, expect, it } from "vitest";
import { amountText, inputUnitsFor } from "./units";

describe("amountText", () => {
  it("writes amounts naturally", () => {
    expect(amountText(150, "g")).toBe("150 g");
    expect(amountText(250, "ml")).toBe("250 ml");
    expect(amountText(1, "each")).toBe("1 item");
    expect(amountText(2, "each")).toBe("2 items");
    expect(amountText(0.5, "each")).toBe("0.5 items");
    expect(amountText(1234.5, "g")).toBe("1,234.5 g");
  });
});

describe("inputUnitsFor", () => {
  it("offers only units that convert to the chosen base unit", () => {
    expect(inputUnitsFor("g")).toEqual(["g", "kg"]);
    expect(inputUnitsFor("ml")).toEqual(["ml", "l"]);
    expect(inputUnitsFor("each")).toEqual(["each"]);
  });
});
