import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RecipeSkeleton } from "@/components/recipes-skeleton";
import { RecipeView } from "@/components/recipe-view";
import { TabBar } from "@/components/tab-bar";
import { getEatenHistory, getRecentFoodIds } from "@/lib/entries";
import { getFoods } from "@/lib/foods";
import { getRecipe, getRecipes } from "@/lib/recipes";
import { orderByRecent } from "@/lib/recent";
import { userToday } from "@/lib/server-helpers";

export const metadata: Metadata = { title: "Recipe · Meal Cost Tracker" };

// One recipe: its cost and nutrients per serving, and its ingredients.
// The id in the address is only known when someone visits, so (as the
// Next.js docs require with Cache Components) everything that reads it
// sits inside Suspense, behind a skeleton.
export default function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  return (
    <>
      {/* Bottom padding leaves room for the tab bar fixed at the bottom. */}
      <main className="mx-auto w-full max-w-lg px-4 pt-8 pb-28">
        <Suspense fallback={<RecipeSkeleton />}>
          {params.then(({ id }) => (
            <Recipe id={id} />
          ))}
        </Suspense>
      </main>
      <TabBar active="kitchen" />
    </>
  );
}

async function Recipe({ id }: { id: string }) {
  const today = await userToday();
  // Your other recipes and what you ate lately are for "Tired of this?":
  // loading them with the page means the swap stack opens instantly.
  const [recipe, foods, recentIds, recipes, history] = await Promise.all([
    getRecipe(id),
    getFoods(),
    getRecentFoodIds(),
    getRecipes(),
    getEatenHistory(today),
  ]);

  // Someone else's recipe, a deleted one, or a typo in the address.
  if (!recipe) {
    return (
      <section className="rounded-2xl bg-card px-5 py-10 text-center">
        <h1 className="text-lg font-semibold">This recipe doesn&apos;t exist anymore</h1>
        <Link
          href="/recipes"
          className="mt-4 inline-flex h-11 items-center gap-1 font-medium text-primary"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back to recipes
        </Link>
      </section>
    );
  }

  // A fresh view per recipe, so an open sheet never follows you to another.
  return (
    <RecipeView
      key={recipe.id}
      recipe={recipe}
      foods={orderByRecent(foods, recentIds)}
      recipes={recipes}
      history={history}
      today={today}
    />
  );
}
