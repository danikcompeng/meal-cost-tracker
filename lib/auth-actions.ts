"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logAuthError } from "./auth-log";
import { cleanLoginCode } from "./login-code";
import { createClient } from "./supabase/server";
import type { FormState } from "./types";

/** Also says where the email went, so the next step can show it. */
export type LoginEmailState = FormState & { email?: string };

export async function sendMagicLink(
  _prev: LoginEmailState,
  formData: FormData,
): Promise<LoginEmailState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) {
    return { ok: false, fieldErrors: { email: "Enter a valid email." } };
  }

  // Where the link in the email should send you back to.
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  // One email with both a link and a code (see lib/login-code.ts): they're
  // the same one-time login, so using either one uses up the other.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    logAuthError("sendMagicLink", error);
    // "Too many": usually one login email a minute per address, but it can
    // also be Supabase's hourly cap, when maybe no email went out at all.
    if (error.status === 429) {
      return {
        ok: false,
        message:
          "You asked for a login email very recently. If it arrived, use its code (\"I already have a code\"). Otherwise wait a minute and try again.",
      };
    }
    return { ok: false, message: "Couldn't send the email. Try again in a minute." };
  }
  return { ok: true, email };
}

/**
 * Logs you in with the code from the email, typed into the app. The login
 * cookie is saved in the app you typed it into, which is the whole point
 * on an iPhone home-screen app (see lib/login-code.ts).
 */
export async function verifyLoginCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const code = cleanLoginCode(String(formData.get("code") ?? ""));
  if (!code) {
    return { ok: false, fieldErrors: { code: "Type the number from the email." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

  if (error) {
    logAuthError("verifyLoginCode", error);
    // Supabase limits how fast you can try codes, so guessing can't work.
    if (error.status === 429) {
      return { ok: false, fieldErrors: { code: "Too many tries. Wait a minute, then try again." } };
    }
    // Supabase couldn't be reached (status 0) or broke (5xx): the code
    // probably wasn't checked, so "That code didn't work" would be wrong
    // and would send you off for a new email you don't need. (If it was
    // used up after all, the next try says "didn't work", and Start over
    // still gets you in.)
    if (!error.status || error.status >= 500) {
      return { ok: false, message: "Couldn't check the code just now. Tap Log in again in a minute." };
    }
    // Wrong, expired (after 1 hour), already used (e.g. you tapped the
    // link first) or replaced by a newer email: Supabase doesn't say which
    // in a way worth showing.
    return {
      ok: false,
      fieldErrors: {
        code: "That code didn't work. Check it's from the latest email, or start over to get a new one.",
      },
    };
  }
  // Outside any try/catch on purpose: redirect() works by throwing.
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logAuthError("signOut", error);
    // Supabase couldn't end the session on its side, and then it keeps the
    // login cookie too, so you'd still be logged in. "local" only deletes
    // this device's cookie, which always works: logging out of this phone
    // is what you asked for. (Supabase's docs suggest the same fallback.)
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/login");
}
