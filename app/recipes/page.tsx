import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { KitchenSwitch } from "@/components/kitchen-switch";
import { RecipeList } from "@/components/recipe-list";
import { RecipesSkeleton } from "@/components/recipes-skeleton";
import { TabBar } from "@/components/tab-bar";
import { getRecentRecipeIds } from "@/lib/entries";
import { getFoods } from "@/lib/foods";
import { getRecipes } from "@/lib/recipes";
import { orderByRecent } from "@/lib/recent";

export const metadata: Metadata = { title: "Recipes · Meal Cost Tracker" };

// The Kitchen tab opens here: your staple meals, recently eaten first.
export default function RecipesPage() {
  return (
    <>
      {/* Bottom padding leaves room for the tab bar fixed at the bottom. */}
      <main className="mx-auto w-full max-w-lg px-4 pt-8 pb-28">
        <AppHeader title="Recipes">
          <KitchenSwitch current="recipes" />
        </AppHeader>
        {/* Your recipes need your login cookie, only known per request, so
            they stream in behind Suspense while the header shows at once. */}
        <Suspense fallback={<RecipesSkeleton />}>
          <Recipes />
        </Suspense>
      </main>
      <TabBar active="kitchen" />
    </>
  );
}

async function Recipes() {
  // Live data: only load it on a real visit, never ahead of time.
  await connection();
  const [recipes, foods, recentIds] = await Promise.all([
    getRecipes(),
    getFoods(),
    getRecentRecipeIds(),
  ]);
  return <RecipeList recipes={orderByRecent(recipes, recentIds)} hasFoods={foods.length > 0} />;
}
