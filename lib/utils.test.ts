import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("knows text-label is a size, so it keeps the text colour beside it", () => {
    expect(cn("text-label text-muted-foreground")).toBe("text-label text-muted-foreground");
  });

  it("keeps a small red button red (Button's size=sm after variant=destructive)", () => {
    expect(cn("text-sm bg-destructive/10 text-destructive h-7 text-label")).toBe(
      "bg-destructive/10 text-destructive h-7 text-label",
    );
  });

  it("lets text-label replace another size, and another size replace it", () => {
    expect(cn("text-sm", "text-label")).toBe("text-label");
    expect(cn("text-label", "text-base")).toBe("text-base");
  });
});
