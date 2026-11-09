import { describe, expect, it } from "vitest";
import { inputUnitsFor } from "./units";

describe("inputUnitsFor", () => {
  it("offers only units that convert to the chosen base unit", () => {
    expect(inputUnitsFor("g")).toEqual(["g", "kg"]);
    expect(inputUnitsFor("ml")).toEqual(["ml", "l"]);
    expect(inputUnitsFor("each")).toEqual(["each"]);
  });
});
