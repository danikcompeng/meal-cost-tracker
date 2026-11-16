// Keeps your work when a save can't reach the server.
//
// Why this exists: guarded() (lib/server-helpers.ts) catches failures ON
// THE SERVER and turns them into a form message. But when the phone is
// offline the request never gets there: the failure happens in the phone,
// nothing catches it, and React hands it to the error page, which
// replaces the whole screen. The open sheet and whatever you typed are
// gone. The same happens when the connection drops while the server is
// still working, except then the save may have happened anyway.
//
// Wrapping an action with keepOnFailure catches that failure in the phone
// instead and gives back a normal { ok: false, message } the form already
// knows how to show, next to the button, with your input still there.

import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";

/** The words for one action's failure message. */
export type FailureWords = {
  /** What failed, as in "Couldn't log it": "log it", "save", "delete it". */
  verb: string;
  /** How to try again, as in "then tap Log it again". */
  retry: string;
  /**
   * Only for saves that ADD something (logging, a new recipe). If the
   * connection dropped while the server was working, it may have been
   * saved already, and trying again would add it twice. So the message
   * says where to look first: "Check Today".
   */
  checkFirst?: string;
};

/** When the app on the phone is older than the server (see below). */
export const UPDATED_MESSAGE =
  "The app was just updated. Close it and open it again (or reload the page), then try again.";

/**
 * The message for a save that failed in the phone. `online` is what the
 * phone says (navigator.onLine): false means it never left the phone;
 * true means it left, and the connection dropped somewhere on the way.
 */
export function failureMessage(words: FailureWords, online: boolean): string {
  const { verb, retry, checkFirst } = words;
  if (!online) return `Couldn't ${verb}: no connection. Check your connection, then ${retry}.`;
  if (checkFirst) {
    return `The connection dropped, so it may have worked anyway. ${checkFirst} before you ${retry}.`;
  }
  return `Couldn't ${verb}: the connection dropped. Please ${retry}.`;
}

/** The usual words: "save" and "tap Save changes again". */
export function tapAgain(verb: string, button: string, checkFirst?: string): FailureWords {
  return { verb, retry: `tap ${button} again`, checkFirst };
}

/**
 * Reloads the page's data, but only once a tiny request to our own server
 * gets an answer. Why: right after a dropped connection it's often still
 * dead, and a refresh that fails makes Next reload the whole page, which
 * shows the phone's "no internet" page instead of the sheet and what you
 * typed. The manifest is used because it's small and open without a login.
 */
export async function refreshIfReachable(refresh: () => void): Promise<void> {
  try {
    const response = await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store" });
    if (response.ok) refresh();
  } catch {
    // Still no connection: leave the page as it is.
  }
}

/** The answer every wrapped action gives: did it work, and why not. */
type ActionResult = { ok: boolean; message?: string };
type Failure = { ok: false; message: string };

/**
 * Wraps a server action (works for useActionState and for a plain call
 * inside a transition). Same arguments, same result, except a failure in
 * the phone comes back as { ok: false, message } instead of throwing.
 *
 * - Next's own redirects still go through: when an action calls
 *   redirect() (logging in with the code, logging out), Next delivers it
 *   to the phone as a thrown error, and unstable_rethrow throws that one
 *   again so the page moves on as it should.
 * - After a deploy, a page left open (an installed app can stay open for
 *   days) still knows the old version's actions, and the server refuses
 *   them. Tapping again would fail the same way forever, and it isn't the
 *   connection, so it says to reopen the app instead.
 * - `afterDrop` runs when the connection dropped on the way (not when
 *   offline): e.g. reload Today with refreshIfReachable, so if the entry
 *   did save, you see it behind the sheet before tapping again.
 */
export function keepOnFailure<Args extends unknown[], Result extends ActionResult>(
  action: (...args: Args) => Promise<Result>,
  // The "extends" check makes TypeScript refuse an action whose answer
  // couldn't be a plain failure (say one that always has a `value`):
  // then the failure below would be a lie about its shape.
  words: Failure extends Result ? FailureWords : never,
  afterDrop?: () => void,
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    try {
      return await action(...args);
    } catch (error) {
      unstable_rethrow(error);
      // The real reason, for the browser console.
      console.error(error);
      // "as Result": the check on `words` above means a plain failure is
      // one of this action's own answers.
      if (unstable_isUnrecognizedActionError(error)) {
        return { ok: false, message: UPDATED_MESSAGE } as Result;
      }
      const online = typeof navigator === "undefined" || navigator.onLine !== false;
      if (online) afterDrop?.();
      return { ok: false, message: failureMessage(words, online) } as Result;
    }
  };
}
