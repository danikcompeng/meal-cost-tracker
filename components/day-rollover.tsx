"use client";

// Keeps "Today" honest when the app was left open overnight.
//
// Why: phones keep an installed web app in memory. Open it at 10 pm, come
// back at 8 am, and the page still shows last night's "today", so your
// breakfast would quietly land on yesterday. Whenever the app comes back to
// the screen, this checks the date on your phone, and if it has moved on
// since the page loaded, it reloads the data for the new day.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { todayIn } from "@/lib/dates";
import { saveTimezoneCookie } from "./timezone-sync";

export function DayRollover({ today }: { today: string }) {
  const router = useRouter();

  useEffect(() => {
    function check() {
      if (document.visibilityState !== "visible") return;
      // You might also have travelled to another timezone overnight.
      const tzChanged = saveTimezoneCookie();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tzChanged || todayIn(tz) !== today) router.refresh();
    }
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [router, today]);

  return null;
}
