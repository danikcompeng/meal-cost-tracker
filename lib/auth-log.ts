// Login problems only show you a short message ("That code didn't work"),
// so this logs the real reason on the server: in the dev server terminal
// and in Vercel's logs (e.g. "Token has expired or is invalid").
//
// Its own file, not lib/auth-actions.ts, because a "use server" file may
// only export server actions.
export function logAuthError(step: string, error: { message: string; status?: number; code?: string }) {
  console.error(`${step} failed:`, {
    message: error.message,
    status: error.status,
    code: error.code,
  });
}
