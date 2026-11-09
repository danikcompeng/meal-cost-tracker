import { describe, expect, it } from "vitest";
import { addDays, dayLabel, dayTitle, isLoggableDay, isValidDay, isValidTimeZone, todayIn } from "./dates";

describe("todayIn", () => {
  // 03:00 UTC on Nov 10 is still 7 pm on Nov 9 in California.
  const lateEveningInCalifornia = new Date("2026-11-10T03:00:00Z");

  it("uses your timezone, not the server's UTC", () => {
    expect(todayIn("America/Los_Angeles", lateEveningInCalifornia)).toBe("2026-11-09");
    expect(todayIn("UTC", lateEveningInCalifornia)).toBe("2026-11-10");
  });

  it("is already tomorrow east of UTC", () => {
    // 20:00 UTC on Nov 9 is 7 am on Nov 10 in Sydney.
    expect(todayIn("Australia/Sydney", new Date("2026-11-09T20:00:00Z"))).toBe("2026-11-10");
  });

  it("changes exactly at your midnight", () => {
    // Los Angeles is UTC-8 in November, so midnight there is 08:00 UTC.
    expect(todayIn("America/Los_Angeles", new Date("2026-11-10T07:59:59Z"))).toBe("2026-11-09");
    expect(todayIn("America/Los_Angeles", new Date("2026-11-10T08:00:00Z"))).toBe("2026-11-10");
  });

  it("falls back to UTC for a missing or made-up timezone", () => {
    expect(todayIn(undefined, lateEveningInCalifornia)).toBe("2026-11-10");
    expect(todayIn("Mars/Olympus_Mons", lateEveningInCalifornia)).toBe("2026-11-10");
  });
});

describe("isValidTimeZone", () => {
  it("knows real zones and rejects others", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("Not/A_Zone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });
});

describe("isValidDay", () => {
  it("accepts real days only", () => {
    expect(isValidDay("2026-11-09")).toBe(true);
    expect(isValidDay("2028-02-29")).toBe(true); // leap year
    expect(isValidDay("2026-02-29")).toBe(false);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("2026-11-9")).toBe(false);
    expect(isValidDay("yesterday")).toBe(false);
    expect(isValidDay(null)).toBe(false);
  });
});

describe("addDays", () => {
  it("crosses months and years", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("isn't thrown off by daylight saving", () => {
    // US clocks change on 2026-11-01.
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
});

describe("isLoggableDay", () => {
  const today = "2026-11-09";

  it("allows today and past days", () => {
    expect(isLoggableDay("2026-11-09", today)).toBe(true);
    expect(isLoggableDay("2025-01-15", today)).toBe(true);
  });

  it("allows one day of slack for timezones, but not further", () => {
    expect(isLoggableDay("2026-11-10", today)).toBe(true);
    expect(isLoggableDay("2026-11-11", today)).toBe(false);
  });

  it("rejects nonsense and very old days", () => {
    expect(isLoggableDay("1999-12-31", today)).toBe(false);
    expect(isLoggableDay("2026-13-01", today)).toBe(false);
  });
});

describe("dayTitle", () => {
  it("says Today, Yesterday, or a short date", () => {
    expect(dayTitle("2026-11-09", "2026-11-09")).toBe("Today");
    expect(dayTitle("2026-11-08", "2026-11-09")).toBe("Yesterday");
    expect(dayTitle("2026-11-01", "2026-11-09")).toBe("Sun, Nov 1");
  });
});

describe("dayLabel", () => {
  it("reads naturally and doesn't shift a day", () => {
    expect(dayLabel("2026-11-09")).toBe("Monday, November 9");
  });
});
