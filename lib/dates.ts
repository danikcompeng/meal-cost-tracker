// Calendar days as "YYYY-MM-DD" strings. Pure functions, no database.
//
// Why timezones matter: Vercel's servers run on UTC. At 7 pm in California
// it's already 3 am tomorrow in UTC, so "today" must be worked out in YOUR
// timezone, or tonight's dinner would land on tomorrow.

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day like "2026-11-09" (not "2026-02-30"). */
export function isValidDay(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // new Date quietly rolls Feb 30 over to Mar 2, so check it round-trips.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** True if `timeZone` is a name the browser and server both know, like "America/Los_Angeles". */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Today's date in `timeZone`, falling back to UTC if the zone is unknown. */
export function todayIn(timeZone: string | undefined, now: Date = new Date()): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** addDays("2026-11-30", 1) -> "2026-12-01". */
export function addDays(day: string, days: number): string {
  // Done in UTC so daylight-saving changes can't skip or repeat a day.
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Days you can log to: anything from 2000 up to today. One extra day of
 * slack covers a browser whose timezone cookie hasn't reached the server yet.
 * Future days are for planning, which comes later.
 */
export function isLoggableDay(day: string, today: string): boolean {
  return isValidDay(day) && day >= "2000-01-01" && day <= addDays(today, 1);
}

const shortDay = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** The page title: "Today", "Yesterday", or short like "Sun, Nov 1". */
export function dayTitle(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return shortDay.format(new Date(`${day}T00:00:00Z`));
}

const longDay = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** "Monday, November 9". The day has no timezone, so format it as UTC. */
export function dayLabel(day: string): string {
  return longDay.format(new Date(`${day}T00:00:00Z`));
}
