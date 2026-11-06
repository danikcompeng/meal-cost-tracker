"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { FormState } from "./types";

export async function sendMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) {
    return { ok: false, fieldErrors: { email: "Enter a valid email." } };
  }

  // Where the link in the email should send you back to.
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    // Log the real reason on the server (shows in the dev server terminal).
    console.error("sendMagicLink failed:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { ok: false, message: "Couldn't send the email. Try again in a minute." };
  }
  return { ok: true, message: `Check ${email} for a login link.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
