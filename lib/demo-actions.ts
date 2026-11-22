"use server";
// "Try the demo" on the login page and "Reset demo" in Settings
// (plans/demo.md). Both run on the server: the browser only ever asks
// for "the demo", never sees its email or password.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuthError } from "./auth-log";
import { demoCredentials, isDemoEmail, seedDemo } from "./demo";
import { needsReseed } from "./demo-seed";
import { guarded, userToday } from "./server-helpers";
import { createClient } from "./supabase/server";
import type { FormState } from "./types";

/**
 * Logs into the shared demo account with the password from the server's
 * environment. Puts the sample data back first if it's over an hour old
 * (or was never seeded).
 */
export async function signInDemo(): Promise<FormState> {
  const result = await guarded("signInDemo", "Couldn't open the demo. Please try again.", async () => {
    const credentials = demoCredentials();
    if (!credentials) return { ok: false, message: "The demo isn't set up yet." };

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      logAuthError("signInDemo", error);
      // Supabase limits sign-ins per address, and every demo sign-in
      // comes from our server's address, so a busy minute can hit it.
      if (error.status === 429) {
        return { ok: false, message: "Lots of people just tried the demo. Wait a minute, then try again." };
      }
      // Wrong password (changed in Supabase but not in Vercel) or the
      // account is gone: nothing the visitor can fix.
      return { ok: false, message: "The demo isn't working right now. Please try again later." };
    }

    if (needsReseed(data.user.user_metadata, new Date())) {
      try {
        await seedDemo(supabase, data.user, await userToday());
      } catch (seedError) {
        // Let them in anyway: the seed date wasn't saved, so the next
        // demo sign-in tries again, and Settings has Reset demo.
        console.error("signInDemo: seeding failed:", seedError);
      }
    }
    return { ok: true };
  });
  // Outside guarded on purpose: redirect() works by throwing.
  if (result.ok) redirect("/");
  return result;
}

/** Settings → Reset demo: the sample data, fresh. The demo account only. */
export async function resetDemo(): Promise<FormState> {
  const result = await guarded("resetDemo", "Couldn't reset the demo. Please try again.", async () => {
    const supabase = await createClient();
    // getUser asks Supabase who this is (not just the login token), and
    // seedDemo checks the email again before it deletes anything.
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Not logged in");
    if (!isDemoEmail(data.user.email)) return { ok: false, message: "Only the demo account can be reset." };

    await seedDemo(supabase, data.user, await userToday());
    revalidatePath("/", "layout");
    return { ok: true };
  });
  if (result.ok) redirect("/");
  return result;
}
