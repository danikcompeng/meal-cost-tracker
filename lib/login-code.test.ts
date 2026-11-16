import { describe, expect, it } from "vitest";
import { cleanLoginCode } from "./login-code";

describe("cleanLoginCode", () => {
  it("keeps a plain code", () => {
    expect(cleanLoginCode("12345678")).toBe("12345678");
  });

  it("drops spaces and dashes you typed or pasted", () => {
    expect(cleanLoginCode(" 1234 5678 ")).toBe("12345678");
    expect(cleanLoginCode("1234-5678")).toBe("12345678");
    expect(cleanLoginCode("123 456")).toBe("123456");
  });

  it("accepts every length Supabase allows (6 to 10)", () => {
    expect(cleanLoginCode("123456")).toBe("123456");
    expect(cleanLoginCode("1234567890")).toBe("1234567890");
  });

  it("keeps leading zeros (it's a code, not a number)", () => {
    expect(cleanLoginCode("00012345")).toBe("00012345");
  });

  it("refuses too short, too long, empty or non-digits", () => {
    expect(cleanLoginCode("12345")).toBeNull();
    expect(cleanLoginCode("12345678901")).toBeNull();
    expect(cleanLoginCode("")).toBeNull();
    expect(cleanLoginCode("   ")).toBeNull();
    expect(cleanLoginCode("1234abcd")).toBeNull();
    expect(cleanLoginCode("1234.5678")).toBeNull();
  });
});
