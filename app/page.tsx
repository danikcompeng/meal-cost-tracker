import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/app-header";
import { DayNav } from "@/components/day-nav";
import { DayRollover } from "@/components/day-rollover";
import { DaySlide } from "@/components/slide-in";
import { TabBar } from "@/components/tab-bar";
import { TodaySkeleton } from "@/components/today-skeleton";
import { TodayView } from "@/components/today-view";
import { dayTitle, isLoggableDay } from "@/lib/dates";
import { getEatenHistory, getEntriesForDay, getRecentFoodIds, getRecentRecipeIds } from "@/lib/entries";
import { getFoods } from "@/lib/foods";
import { getRecipes } from "@/lib/recipes";
import { orderByRecent } from "@/lib/recent";
import { getTargets } from "@/lib/settings";
import { mealForHour } from "@/lib/meals";
import { DETAILS_COOKIE } from "@/lib/summary";
import { userHour, userToday } from "@/lib/server-helpers";

export const metadata: Metadata = { title: "Today" };

// The main screen: what you ate on one day. "?day=2026-11-08" shows a past
// day; without it, you see today.
export default function TodayPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      {/* Bottom padding leaves room for the tab bar fixed at the bottom
          (pb-above-tab-bar, in globals.css). */}
      <main className="mx-auto w-full max-w-lg px-4 pt-8 pb-above-tab-bar">
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

  // Which day it is only needs the address and the timezone cookie, so the
  // header shows straight away. The day's food streams in after it, behind
  // a skeleton that knows whether it's a past day (no rings then).
  return (
    <>
      <DayRollover today={today} />
      {/* DaySlide: going to another day, its title, date and everything
          under them slide in from that side (slide-in.tsx). */}
      <AppHeader
        title={
          <DaySlide day={day} inline>
            {dayTitle(day, today)}
          </DaySlide>
        }
      >
        <DayNav day={day} today={today} />
      </AppHeader>
      <Suspense
        fallback={
          <DaySlide day={day}>
            <TodaySkeleton past={day !== today} withHeader={false} />
          </DaySlide>
        }
      >
        <DayContent day={day} today={today} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DayContent({
  day,
  today,
  searchParams,
}: { day: string; today: string } & Pick<PageProps<"/">, "searchParams">) {
  const [entries, foods, recentIds, recipes, recentRecipeIds, history, targets, hour, cookieStore] =
    await Promise.all([
      getEntriesForDay(day),
      getFoods(),
      getRecentFoodIds(),
      getRecipes(),
      getRecentRecipeIds(),
      // For "Tired of this?": what you ate lately (null if it didn't load).
      getEatenHistory(today),
      getTargets(),
      userHour(),
      cookies(),
    ]);
  // A recipe with no ingredients has nothing to log yet, so it's left out.
  const loggable = recipes.filter((recipe) => recipe.ingredients.length > 0);

  // "?log=<food id>" comes from the scanner: open the "Log it" sheet for
  // that food straight away. An id that isn't one of your foods is ignored.
  const logId = (await searchParams).log;
  const logFood = typeof logId === "string" ? (foods.find((f) => f.id === logId) ?? null) : null;

  const view = (
    <TodayView
      // A fresh view per day, so an open sheet doesn't follow you to
      // another day. The scanned food is part of the key too, so arriving
      // from the scanner always opens its sheet.
      key={`${day}:${logFood?.id ?? ""}`}
      day={day}
      today={today}
      isToday={day === today}
      entries={entries}
      foods={orderByRecent(foods, recentIds)}
      recipes={orderByRecent(loggable, recentRecipeIds)}
      // All of them: the swap leaves out empty ones itself, and still
      // needs to know they exist ("none has ingredients yet").
      swapRecipes={recipes}
      history={history}
      targets={targets}
      logFood={logFood}
      // Worked out on the server from your timezone, so the page and the
      // browser agree on it (no flicker when the page comes alive).
      suggestedMeal={mealForHour(hour)}
      // Read on the server, so the summary is drawn open or closed
      // straight away instead of jumping after the page loads.
      detailsOpen={cookieStore.get(DETAILS_COOKIE)?.value === "1"}
    />
  );
  // Slides in from the side you moved towards, with the title and date
  // (or doesn't, if the skeleton already did).
  return <DaySlide day={day}>{view}</DaySlide>;
}
