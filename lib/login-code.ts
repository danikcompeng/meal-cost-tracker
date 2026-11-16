// The one-time code in the login email ("Or type this code in the app").
//
// Why a code at all: an app added to an iPhone's home screen keeps its own
// login, separate from Safari's, and a link in an email always opens in
// Safari (or Gmail's browser). So tapping the link logs Safari in, not the
// app. Typing the code logs in whichever app you typed it into.
//
// How long the code is is a Supabase setting (Authentication -> Sign In /
// Providers -> Email -> "Email OTP length"). It can be 6 to 10 digits, so
// we accept any of those and don't assume one length.

export const LOGIN_CODE_DIGITS = { min: 6, max: 10 } as const;

/**
 * Tidies what you typed or pasted ("1234 5678", "1234-5678") into just the
 * digits. Returns null if what's left isn't 6 to 10 digits.
 */
export function cleanLoginCode(typed: string): string | null {
  const digits = typed.replace(/[\s-]/g, "");
  const { min, max } = LOGIN_CODE_DIGITS;
  return new RegExp(`^\\d{${min},${max}}$`).test(digits) ? digits : null;
}
