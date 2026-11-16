"use client"; // Error pages must run in the browser so "Try again" works.

// Shown instead of a screen when loading its data fails (for example, the
// database is unreachable). Saves don't land here any more: they show
// their own message next to their button (lib/action-call.ts), so
// "Nothing you logged is lost" is true. The real reason is in the browser
// console and in the server logs.
//
// It keeps the tab bar, so "Try again" isn't the only way out. Not on the
// login screen, where the tabs would only lead back to it.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TabBar } from "@/components/tab-bar";
import { useOnline } from "@/components/use-online";
import { cn } from "@/lib/utils";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const showTabs = !usePathname().startsWith("/login");
  const online = useOnline();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <main className={cn("mx-auto w-full max-w-lg px-4 pt-16 text-center", showTabs && "pb-above-tab-bar")}>
        <h1 className="text-[30px] leading-tight font-bold">Couldn’t load this</h1>
        <p className="mt-3 text-muted-foreground">
          Check your connection, then try again. Nothing you logged is lost.
        </p>
        <Button
          // retry() reloads the page's data. Offline that fails, and Next
          // then reloads the whole page, which shows the phone's "no
          // internet" page (no way back in the installed app). So while
          // offline it waits: focusable but doing nothing, and the strip
          // at the top says why.
          aria-disabled={!online}
          onClick={() => {
            if (navigator.onLine) retry();
          }}
          className="mt-6 h-11 px-6 text-base aria-disabled:opacity-50"
        >
          Try again
        </Button>
      </main>
      {showTabs && <TabBar />}
    </>
  );
}
