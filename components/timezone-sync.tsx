"use client";

// Tells the server your timezone, so "today" means YOUR today.
//
// Why: the server runs on UTC and can't see your clock. The browser knows
// your timezone (e.g. "America/Los_Angeles"), so it saves it in a small
// "tz" cookie that's sent with every request. If the cookie was missing or
// out of date (first visit, or you travelled), the page reloads its data
// once with the right day.
//
// Later this moves to user_settings.timezone with daily targets.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Saves your timezone in the cookie. Returns true if it changed. */
export function saveTimezoneCookie(): boolean {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!tz) return false;
  const saved = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tz="))
    ?.slice(3);
  if (saved && decodeURIComponent(saved) === tz) return false;
  document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
  return true;
}

export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    if (saveTimezoneCookie()) router.refresh();
  }, [router]);

  return null;
}
