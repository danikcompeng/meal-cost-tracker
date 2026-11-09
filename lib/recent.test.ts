import { describe, expect, it } from "vitest";
import { orderByRecent } from "./recent";

const foods = ["apple", "bread", "eggs", "oats", "rice"].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((f) => f.id);

describe("orderByRecent", () => {
  it("puts recently logged foods first, newest first", () => {
    expect(ids(orderByRecent(foods, ["oats", "eggs"]))).toEqual([
      "oats",
      "eggs",
      "apple",
      "bread",
      "rice",
    ]);
  });

  it("counts a repeated food once, at its newest position", () => {
    expect(ids(orderByRecent(foods, ["eggs", "oats", "eggs"])).slice(0, 2)).toEqual([
      "eggs",
      "oats",
    ]);
  });

  it("ignores ids of foods that no longer exist", () => {
    expect(ids(orderByRecent(foods, ["deleted", "rice"]))[0]).toBe("rice");
  });

  it("keeps the original order when nothing was logged", () => {
    expect(ids(orderByRecent(foods, []))).toEqual(ids(foods));
  });
});
