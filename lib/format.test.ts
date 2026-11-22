import { describe, expect, it } from "vitest";
import { formatNumber, roundForDisplay } from "./format";

describe("formatNumber", () => {
  it("shows kcal as whole numbers, rounded, with a thousands comma", () => {
    expect(formatNumber(652.9, "kcal")).toBe("653");
    expect(formatNumber(516.5, "kcal")).toBe("517");
    expect(formatNumber(1274.2, "kcal")).toBe("1,274");
    expect(formatNumber(0, "kcal")).toBe("0");
  });

  it("shows grams whole from 10 g, one decimal under 10 g", () => {
    expect(formatNumber(55.63, "g")).toBe("56");
    expect(formatNumber(10, "g")).toBe("10");
    expect(formatNumber(4.53, "g")).toBe("4.5");
    expect(formatNumber(4, "g")).toBe("4");
    expect(formatNumber(0.4, "g")).toBe("0.4");
  });

  it("shows grams that round up to 10 as 10, not 10.0", () => {
    expect(formatNumber(9.96, "g")).toBe("10");
  });

  it("shows ml and mg as whole numbers", () => {
    expect(formatNumber(749.6, "ml")).toBe("750");
    expect(formatNumber(4.5, "mg")).toBe("5");
  });

  it("never shows 0 for a little above 0", () => {
    expect(formatNumber(0.3, "kcal")).toBe("<1");
    expect(formatNumber(0.04, "g")).toBe("<0.1");
    expect(formatNumber(0.05, "g")).toBe("0.1");
  });

  it("never shows -0", () => {
    expect(formatNumber(-0.01, "g")).toBe("0");
    expect(formatNumber(-0.2, "kcal")).toBe("0");
  });
});

describe("roundForDisplay", () => {
  it("rounds to what the text shows, as a number", () => {
    expect(roundForDisplay(139.6, "g")).toBe(140);
    expect(roundForDisplay(9.64, "g")).toBe(9.6);
    expect(roundForDisplay(652.9, "kcal")).toBe(653);
  });
});
