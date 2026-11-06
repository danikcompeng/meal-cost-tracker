import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { IngredientManager } from "@/components/ingredient-manager";
import { getIngredients } from "@/lib/ingredients";

export const metadata: Metadata = { title: "Ingredients · Meal Cost Tracker" };

export default function IngredientsPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <AppHeader title="Ingredients" />
      {/* Loading your ingredients needs your login cookie, which is only
          known per request, so that part streams in behind Suspense while
          the header shows instantly. */}
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Ingredients />
      </Suspense>
    </main>
  );
}

async function Ingredients() {
  // Your list is live data. This tells Next.js not to build it ahead of
  // time (even with your login cookie available), only on a real visit.
  await connection();
  const ingredients = await getIngredients();
  return <IngredientManager ingredients={ingredients} />;
}
