import { describe, expect, it } from "vitest";
import { deletedMessage, swapNotUndoneMessage, swappedMessage } from "./entry-messages";

describe("deletedMessage", () => {
  it("names the meal like the rest of the app, capitalised, no quotes", () => {
    expect(deletedMessage("Beef and rice", "lunch")).toBe("Beef and rice deleted from Lunch");
    expect(deletedMessage("Rolled oats", "breakfast")).toBe("Rolled oats deleted from Breakfast");
    expect(deletedMessage("Lentil dal", "dinner")).toBe("Lentil dal deleted from Dinner");
    expect(deletedMessage("Banana", "snack")).toBe("Banana deleted from Snack");
  });
});

describe("swappedMessage", () => {
  it("starts with the meal's label and keeps the servings", () => {
    expect(swappedMessage("lunch", "Lentil dal", 1.5)).toBe("Lunch is now Lentil dal · 1.5 servings");
    expect(swappedMessage("breakfast", "Overnight oats", 1)).toBe(
      "Breakfast is now Overnight oats · 1 serving",
    );
    expect(swappedMessage("dinner", "Chilli", 2)).toBe("Dinner is now Chilli · 2 servings");
    expect(swappedMessage("snack", "Protein balls", 1)).toBe("Snack is now Protein balls · 1 serving");
  });
});

describe("swapNotUndoneMessage", () => {
  it("says which meal is still the swapped recipe", () => {
    expect(swapNotUndoneMessage("lunch", "Lentil dal")).toBe("Couldn't undo: Lunch is still Lentil dal.");
    expect(swapNotUndoneMessage("breakfast", "Oats")).toBe("Couldn't undo: Breakfast is still Oats.");
    expect(swapNotUndoneMessage("dinner", "Chilli")).toBe("Couldn't undo: Dinner is still Chilli.");
    expect(swapNotUndoneMessage("snack", "Banana")).toBe("Couldn't undo: Snack is still Banana.");
  });
});
