// Careful: Number(null) is 0 in JavaScript. A value that was never entered
// must stay null so it shows "—", not a made-up 0. Postgres "numeric" can
// also arrive as a string ("13.20"), which this turns into a number.
export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads a number someone typed. Some keyboards type a comma as the decimal
 * point ("3,49"), so a comma is accepted for that.
 *
 * But "1,000" is a problem: in the US that's one thousand, in much of Europe
 * it's 1.000 = one. Guessing wrong logs 1 ml instead of 1000 ml, so a comma
 * followed by exactly three digits is refused as "ambiguous" and the form
 * asks you to write it without the comma.
 *
 * Returns null for blank, "invalid" for not-a-number, "ambiguous" as above.
 */
export function parseDecimal(value: unknown): number | null | "invalid" | "ambiguous" {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return "invalid";
  const s = value.trim();
  if (s === "") return null;
  if (/,\d{3}(?!\d)/.test(s)) return "ambiguous";
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : "invalid";
}

export const AMBIGUOUS_COMMA = "Write it without a comma, like 1000 or 1.5.";

/**
 * Adds up numbers where ONE unknown makes the whole sum unknown. Used for
 * recipes: if one ingredient has no price, the recipe's cost is "—", not
 * a lower number that quietly leaves that ingredient out.
 *
 * An empty list is null too: a recipe with nothing in it hasn't got a
 * cost of $0, it just hasn't got a cost yet.
 */
export function sumOrNull(values: (number | null)[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) return null;
    sum += value;
  }
  return sum;
}
