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

  it("lets a full-width Button's press-wide replace the press every Button has", () => {
    expect(cn("press focus-ring", "h-11 w-full press-wide")).toBe("focus-ring h-11 w-full press-wide");
    expect(cn("press-wide", "press")).toBe("press");
  });

  it("knows the layer classes are z-indexes", () => {
    expect(cn("z-10", "z-tab-bar")).toBe("z-tab-bar");
    expect(cn("z-raised", "z-overlay")).toBe("z-overlay");
    expect(cn("z-toast bg-background")).toBe("z-toast bg-background");
  });

  it("lets text-label replace another size, and another size replace it", () => {
    expect(cn("text-sm", "text-label")).toBe("text-label");
    expect(cn("text-label", "text-base")).toBe("text-base");
  });
});
