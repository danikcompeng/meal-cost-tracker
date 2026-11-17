import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { TabBar } from "@/components/tab-bar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Not found · Meal Cost Tracker" };

// A mistyped or old address. Same calm layout as the error page, with the
// tab bar so you can carry on from here. (Next's own 404 page is plain and
// has no way back in an installed app, which has no address bar.)
export default function NotFound() {
  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 pt-16 pb-above-tab-bar text-center">
        <h1 className="text-3xl leading-tight font-bold">This page doesn’t exist</h1>
        <p className="mt-3 text-muted-foreground">
          The address may be mistyped, or the page has moved.
        </p>
        <Link href="/" className={cn(buttonVariants(), "mt-6 h-11 px-6 text-base")}>
          Go to Today
        </Link>
      </main>
      <TabBar />
    </>
  );
}
