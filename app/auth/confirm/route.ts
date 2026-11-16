// The link in the login email opens this URL. We swap the one-time token
// in the link for a real login session (stored in a cookie), then go home.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { logAuthError } from "@/lib/auth-log";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    // Works even if you open the email on a different browser or device.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) logAuthError("auth/confirm verifyOtp", error);
    ok = !error;
  } else if (code) {
    // Fallback: Supabase's default email link. Only works in the same browser
    // where you asked for the link.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) logAuthError("auth/confirm exchangeCodeForSession", error);
    ok = !error;
  }

  const to = ok ? "/" : "/login?error=link";
  return NextResponse.redirect(new URL(to, request.url));
}
