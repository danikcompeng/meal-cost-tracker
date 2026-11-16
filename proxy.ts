// Runs before every page request (Next.js 16 renamed "middleware" to "proxy").
// Two jobs:
//   1. Refresh the Supabase login cookie so you don't get logged out mid-shop.
//   2. Send anyone who isn't logged in to /login.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims() verifies the login token, so it can't be faked.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!loggedIn && !isPublic) return redirectKeepingCookies(request, response, "/login");
  if (loggedIn && path === "/login") return redirectKeepingCookies(request, response, "/");

  return response;
}

// A redirect is a brand-new response, so copy over any refreshed cookies.
function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Skip static files and images so CSS/JS still load on the login page.
    // .wasm is the barcode reader (public/zxing): no login check needed to
    // download a public file.
    //
    // Also skipped: the manifest and everything under /icons/. Phones and
    // browsers fetch those without your login cookie, so the check would
    // send them the login page instead, and the app would install with a
    // generic icon and name. /icons/ is named on its own (not only by its
    // .png ending) so a future icon without that ending is safe too.
    // manifest.webmanifest and favicon.ico are also caught by their endings;
    // they're named as well so the rule survives if an ending is removed.
    // proxy.test.ts checks these against real addresses.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|webmanifest)$).*)",
  ],
};
