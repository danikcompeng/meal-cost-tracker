import { describe, expect, it } from "vitest";
import { holdEntry, withHeld } from "./held-entries";
import type { MealEntry } from "./types";

const entry = (id: string, meal: MealEntry["meal"] = "lunch") =>
  ({ id, meal, name: id }) as MealEntry;
const ids = (list: MealEntry[]) => list.map((e) => e.id);

describe("holdEntry", () => {
  it("remembers the entry above it in the same meal", () => {
    const list = [entry("a", "breakfast"), entry("b"), entry("c")];
    expect(holdEntry(list, list[2]).afterId).toBe("b");
  });

  it("first in its meal: nothing above (another meal's entry doesn't count)", () => {
    const list = [entry("a", "breakfast"), entry("b")];
    expect(holdEntry(list, list[1]).afterId).toBeNull();
  });
});

describe("withHeld", () => {
  const a = entry("a", "breakfast");
  const b = entry("b");
  const c = entry("c");
  const d = entry("d");

  it("leaves the list alone while the server still sends the entry", () => {
    expect(ids(withHeld([a, b, c], [holdEntry([a, b, c], c)]))).toEqual(["a", "b", "c"]);
  });

  it("puts a dropped entry back after the one that was above it", () => {
    const held = holdEntry([a, b, c, d], c);
    expect(ids(withHeld([a, b, d], [held]))).toEqual(["a", "b", "c", "d"]);
  });

  it("first in its meal goes back first in its meal", () => {
    const held = holdEntry([a, b, c], b);
    expect(ids(withHeld([a, c], [held]))).toEqual(["a", "b", "c"]);
  });

  it("the entry above it gone too: last in its meal", () => {
    const held = holdEntry([a, b, c, d], c);
    expect(ids(withHeld([a, d], [held]))).toEqual(["a", "d", "c"]);
  });

  it("the only entry of its meal: at the end", () => {
    const held = holdEntry([a, b], b);
    expect(ids(withHeld([a], [held]))).toEqual(["a", "b"]);
  });
});
