import "server-only";
// Shared by the server action files. These live here, not in a "use server"
// file, on purpose: every function exported from a "use server" file becomes
// something the browser can call, and these are helpers, not actions.

import { cookies } from "next/headers";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { todayIn } from "./dates";

// Server actions can be called by anyone who sends a POST request, not only
// through our form, so every action checks the login first.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Not logged in");
  return supabase;
}

/** Today in your timezone. The browser sends it in the "tz" cookie. */
export async function userToday(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return todayIn(tz ? decodeURIComponent(tz) : undefined);
}

/**
 * Runs a server action and turns any unexpected failure (lost connection,
 * expired login, database down) into a friendly message for the form.
 *
 * Why: if an action throws, the error doesn't go back to the form. It goes
 * to the error page, which replaces the whole screen, so you'd lose the
 * open sheet and see "Couldn't load this" instead of "Couldn't log it".
 */
export async function guarded<T extends { ok: boolean; message?: string }>(
  action: string,
  message: string,
  run: () => Promise<T>,
): Promise<T | { ok: false; message: string }> {
  try {
    return await run();
  } catch (error) {
    console.error(`${action} failed:`, error);
    return { ok: false, message };
  }
}

// The user only sees a friendly message, so log the real reason on the
// server: the dev server terminal locally, or the function logs on Vercel.
// A vague message with nothing logged is what hid the login email bug.
export function logDbError(action: string, error: PostgrestError) {
  console.error(`${action} failed:`, {
    message: error.message,
    code: error.code, // Postgres error code, e.g. 23514 = a CHECK rule failed
    details: error.details,
    hint: error.hint,
  });
}
