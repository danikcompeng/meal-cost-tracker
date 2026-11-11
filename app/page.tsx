import { Suspense } from "react";
import type { Metadata } from "next";
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
import { userToday } from "@/lib/server-helpers";

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

  const [entries, foods, recentIds, targets] = await Promise.all([
    getEntriesForDay(day),
    getFoods(),
    getRecentFoodIds(),
    getTargets(),
  ]);

  return (
    <>
      <DayRollover today={today} />
      <AppHeader title={dayTitle(day, today)}>
        <DayNav day={day} today={today} />
      </AppHeader>
      <TodayView
        // A fresh view per day, so an open sheet doesn't follow you to
        // another day.
        key={day}
        day={day}
        isToday={day === today}
        entries={entries}
        foods={orderByRecent(foods, recentIds)}
        targets={targets}
      />
    </>
  );
}
