import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/app-header";
import { DayNav } from "@/components/day-nav";
import { DayRollover } from "@/components/day-rollover";
import { TabBar } from "@/components/tab-bar";
import { TodaySkeleton } from "@/components/today-skeleton";
import { TodayView } from "@/components/today-view";
import { dayTitle, isLoggableDay } from "@/lib/dates";
import { getEntriesForDay, getRecentFoodIds } from "@/lib/entries";
import { getFoods } from "@/lib/foods";
import { orderByRecent } from "@/lib/recent";
import { getTargets } from "@/lib/settings";
import { mealForHour } from "@/lib/meals";
import { DETAILS_COOKIE } from "@/lib/summary";
import { userHour, userToday } from "@/lib/server-helpers";

export const metadata: Metadata = { title: "Today · Meal Cost Tracker" };

// The main screen: what you ate on one day. "?day=2026-11-08" shows a past
// day; without it, you see today.
export default function TodayPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      {/* Bottom padding leaves room for the tab bar fixed at the bottom. */}
      <main className="mx-auto w-full max-w-lg px-4 pt-8 pb-28">
        {/* Everything here depends on your login and timezone cookies, which
            are only known per request, so it streams in behind Suspense. */}
        <Suspense fallback={<TodaySkeleton />}>
          <Day searchParams={searchParams} />
        </Suspense>
      </main>
      <TabBar active="today" />
    </>
  );
}

async function Day({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const today = await userToday();
  const requested = (await searchParams).day;
  // Anything odd in the address (a typo, a future day) just shows today.
  const day =
    typeof requested === "string" && isLoggableDay(requested, today) && requested <= today
      ? requested
      : today;

  const [entries, foods, recentIds, targets, hour, cookieStore] = await Promise.all([
    getEntriesForDay(day),
    getFoods(),
    getRecentFoodIds(),
    getTargets(),
    userHour(),
    cookies(),
  ]);

  // "?log=<food id>" comes from the scanner: open the "Log it" sheet for
  // that food straight away. An id that isn't one of your foods is ignored.
  const logId = (await searchParams).log;
  const logFood = typeof logId === "string" ? (foods.find((f) => f.id === logId) ?? null) : null;

  return (
    <>
      <DayRollover today={today} />
      <AppHeader title={dayTitle(day, today)}>
        <DayNav day={day} today={today} />
      </AppHeader>
      <TodayView
        // A fresh view per day, so an open sheet doesn't follow you to
        // another day. The scanned food is part of the key too, so arriving
        // from the scanner always opens its sheet.
        key={`${day}:${logFood?.id ?? ""}`}
        day={day}
        isToday={day === today}
        entries={entries}
        foods={orderByRecent(foods, recentIds)}
        targets={targets}
        logFood={logFood}
        // Worked out on the server from your timezone, so the page and the
        // browser agree on it (no flicker when the page comes alive).
        suggestedMeal={mealForHour(hour)}
        // Read on the server, so the summary is drawn open or closed
        // straight away instead of jumping after the page loads.
        detailsOpen={cookieStore.get(DETAILS_COOKIE)?.value === "1"}
      />
    </>
  );
}
