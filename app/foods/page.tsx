import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { TabBar } from "@/components/tab-bar";
import { FoodManager } from "@/components/food-manager";
import { FoodsSkeleton } from "@/components/foods-skeleton";
import { KitchenSwitch } from "@/components/kitchen-switch";
import { KitchenSlide } from "@/components/slide-in";
import { getFoods } from "@/lib/foods";

export const metadata: Metadata = { title: "Foods · Meal Cost Tracker" };

export default function FoodsPage() {
  return (
    <>
      {/* Bottom padding leaves room for the tab bar fixed at the bottom
          (pb-above-tab-bar, in globals.css). */}
      <main className="mx-auto w-full max-w-lg px-4 pt-8 pb-above-tab-bar">
        <AppHeader title="Foods">
          <KitchenSwitch current="foods" />
        </AppHeader>
        {/* Loading your foods needs your login cookie, which is only
            known per request, so that part streams in behind Suspense while
            the header shows instantly.
            KitchenSlide: from the right when you came from Recipes with
            the switch (whatever shows first, skeleton or list). */}
        <KitchenSlide page="foods">
          <Suspense fallback={<FoodsSkeleton />}>
            <Foods />
          </Suspense>
        </KitchenSlide>
      </main>
      {/* Foods lives in the Kitchen tab, next to Recipes. */}
      <TabBar active="kitchen" />
    </>
  );
}

async function Foods() {
  // Your list is live data. This tells Next.js not to build it ahead of
  // time (even with your login cookie available), only on a real visit.
  await connection();
  const foods = await getFoods();
  return <FoodManager foods={foods} />;
}
