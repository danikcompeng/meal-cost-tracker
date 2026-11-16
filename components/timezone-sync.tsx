"use client";

// Tells the server your timezone, so "today" means YOUR today.
//
// Why: the server runs on UTC and can't see your clock. The browser knows
// your timezone (e.g. "America/Los_Angeles"), so it saves it in a small
// "tz" cookie that's sent with every request. If the cookie was missing or
// out of date (first visit, or you travelled), the page reloads its data
// once with the right day.
//
// It stays in this cookie for now. It moves to user_settings.timezone
// later, with the week features that need it (daily targets didn't).

import { useEffect, useRef } from "react";
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

  // Remembered across runs of the effect: in development React runs it
  // twice, and the second run would find the cookie already saved.
  const needsRefresh = useRef(false);

  useEffect(() => {
    if (saveTimezoneCookie()) needsRefresh.current = true;
    if (!needsRefresh.current) return;
    function refresh() {
      needsRefresh.current = false;
      router.refresh();
    }
    if (navigator.onLine) {
      refresh();
      return;
    }
    // Offline, a refresh would show the phone's "no internet" page (see
    // day-rollover.tsx), so it waits until you're back online.
    window.addEventListener("online", refresh, { once: true });
    return () => window.removeEventListener("online", refresh);
  }, [router]);

  return null;
}
