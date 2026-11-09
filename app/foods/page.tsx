import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { FoodManager } from "@/components/food-manager";
import { getFoods } from "@/lib/foods";

export const metadata: Metadata = { title: "Foods · Meal Cost Tracker" };

export default function FoodsPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <AppHeader title="Foods" />
      {/* Loading your foods needs your login cookie, which is only
          known per request, so that part streams in behind Suspense while
          the header shows instantly. */}
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Foods />
      </Suspense>
    </main>
  );
}

async function Foods() {
  // Your list is live data. This tells Next.js not to build it ahead of
  // time (even with your login cookie available), only on a real visit.
  await connection();
  const foods = await getFoods();
  return <FoodManager foods={foods} />;
}
