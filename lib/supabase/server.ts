import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase remembers who is logged in using cookies. This creates a client
// that reads and writes those cookies for the current request.
// Make a new one per request; never share one between users.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies, only actions and route
            // handlers can. That's fine: proxy.ts keeps the session fresh.
          }
        },
      },
    },
  );
}
