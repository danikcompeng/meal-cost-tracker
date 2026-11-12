// Grocery barcodes: checking them and saving them in one standard form.
// Pure functions, no camera or database.
//
// The last digit of a barcode is a "check digit": it's worked out from the
// other digits. If a scan misreads one digit, the check digit stops
// matching, so we can throw the misread away instead of looking up the
// wrong product.
//
// One product, several spellings: an American UPC-A code "036000291452" is
// the same product as the 13-digit "0036000291452" (a leading 0 added), and
// the short UPC-E "04252614" printed on small packs is a squeezed-up UPC-A.
// Everything is saved as 13 digits (or 8 for EAN-8), so one product can
// never become two foods.

/** The formats a grocery scan can report (names from the BarcodeDetector API). */
export const GROCERY_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

/** True when the last digit matches the others (works for 8, 12, 13 and 14 digits). */
export function hasValidCheckDigit(digits: string): boolean {
  if (!/^\d{8,14}$/.test(digits)) return false;
  const body = digits.slice(0, -1);
  return checkDigitFor(body) === Number(digits.at(-1));
}

// Starting from the right, digits are weighted 3, 1, 3, 1, ... and summed.
// The check digit is whatever brings that sum up to a multiple of 10.
function checkDigitFor(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Turns an 8-digit UPC-E code into the 12-digit UPC-A code it stands for.
 * UPC-E drops runs of zeros; the 7th digit says where they went.
 * "04252614" -> "042100005264". Returns null if it isn't UPC-E shaped.
 */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const ns = code[0];
  const [d1, d2, d3, d4, d5, d6] = code.slice(1, 7);
  const check = code[7];
  let middle: string;
  if (d6 === "0" || d6 === "1" || d6 === "2") middle = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === "3") middle = `${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === "4") middle = `${d1}${d2}${d3}${d4}00000${d5}`;
  else middle = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${ns}${middle}${check}`;
}

/**
 * Cleans up a scanned or typed barcode and returns it in the standard form
 * we save, or null if it isn't a valid grocery barcode.
 *
 * `format` comes from the scanner. It matters for 8-digit codes, which can
 * be EAN-8 or UPC-E: the scanner knows which. When you type a number, we
 * have to work it out, and about 1 in 10 UPC-E codes ALSO pass the EAN-8
 * check ("01234565" passes both). Guessing wrong would save the same pack
 * twice: 8 digits when typed, 13 when scanned. The rule:
 *   - Starts with 0 and works as UPC-E: it's UPC-E. EAN-8 codes starting
 *     with 0 are reserved for in-store labels (GS1's rule), never branded
 *     packs, so they won't be in Open Food Facts anyway.
 *   - Otherwise EAN-8 if its check digit fits, then UPC-E.
 */
export function normalizeBarcode(raw: string, format?: string): string | null {
  // People type spaces and dashes as they appear on the pack.
  const digits = raw.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;

  if (digits.length === 8) {
    const upcA = expandUpcE(digits);
    const asUpcE = upcA && hasValidCheckDigit(upcA) ? `0${upcA}` : null;
    if (format === "upc_e") return asUpcE;
    const asEan8 = hasValidCheckDigit(digits) ? digits : null;
    if (format === "ean_8") return asEan8;
    if (asUpcE && digits.startsWith("0")) return asUpcE;
    return asEan8 ?? asUpcE;
  }
  if (!hasValidCheckDigit(digits)) return null;
  if (digits.length === 12) return `0${digits}`;
  if (digits.length === 13) return digits;
  // 14 digits (GTIN-14): with a leading 0 it's just a 13-digit code.
  if (digits.length === 14) return digits.startsWith("0") ? digits.slice(1) : digits;
  return null;
}

/**
 * A scan counts only when the same code is read twice in a row. One
 * blurry frame can produce a wrong code that still passes the check digit
 * (rare, but it happens), and two matching frames rule that out.
 * Returns the code to accept, or null to keep scanning.
 */
export function confirmRead(previous: string | null, current: string | null): string | null {
  return current !== null && current === previous ? current : null;
}
