import { describe, expect, it } from "vitest";
import { amountText, inputUnitsFor, unitWord, unitWordForTyped } from "./units";

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

describe("amountText for recipes", () => {
  it("writes servings, with 1 serving singular", () => {
    expect(amountText(1, "serving")).toBe("1 serving");
    expect(amountText(1.5, "serving")).toBe("1.5 servings");
    expect(amountText(2, "serving")).toBe("2 servings");
  });

  it("is singular when the number shown is 1, even if the saved one isn't exactly", () => {
    expect(amountText(1.004, "serving")).toBe("1 serving");
    expect(amountText(1.004, "each")).toBe("1 item");
    expect(amountText(1.01, "serving")).toBe("1.01 servings");
  });
});

describe("unitWord", () => {
  it("picks singular or plural for items and servings", () => {
    expect(unitWord(1, "serving")).toBe("serving");
    expect(unitWord(1.5, "serving")).toBe("servings");
    expect(unitWord(0.5, "each")).toBe("items");
    expect(unitWord(1, "each")).toBe("item");
  });

  it("leaves g and ml as they are", () => {
    expect(unitWord(1, "g")).toBe("g");
    expect(unitWord(250, "ml")).toBe("ml");
  });

  it("treats no number as more than one", () => {
    expect(unitWord(null, "serving")).toBe("servings");
    expect(unitWord(null, "each")).toBe("items");
  });
});

describe("unitWordForTyped", () => {
  it("follows what's typed in the box", () => {
    expect(unitWordForTyped("1", "serving")).toBe("serving");
    expect(unitWordForTyped(" 1.0 ", "serving")).toBe("serving");
    expect(unitWordForTyped("1,5", "serving")).toBe("servings");
    expect(unitWordForTyped("1.5", "serving")).toBe("servings");
    expect(unitWordForTyped("2", "each")).toBe("items");
    expect(unitWordForTyped("1", "each")).toBe("item");
  });

  it("reads a blank box as its placeholder", () => {
    expect(unitWordForTyped("", "serving", 1)).toBe("serving");
    expect(unitWordForTyped("   ", "each", 1)).toBe("item");
    expect(unitWordForTyped("", "serving")).toBe("servings");
  });

  it("reads a half-typed 1 as 1, and junk as more than one", () => {
    expect(unitWordForTyped("1.", "serving")).toBe("serving");
    expect(unitWordForTyped(".", "serving", 1)).toBe("servings");
    expect(unitWordForTyped("abc", "serving", 1)).toBe("servings");
    expect(unitWordForTyped("1,000", "each", 1)).toBe("items");
  });
});
