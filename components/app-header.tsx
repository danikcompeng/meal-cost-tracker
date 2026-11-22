import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { isDemoAccount } from "@/lib/demo";
import { LogOutButton } from "./log-out-button";

// Settings is a quiet grey link up here rather than a tab: you set your
// targets once and rarely come back.
export function AppHeader({
  title,
  showSettingsLink = true,
  children,
}: {
  /** Words, or on Today the day's name sliding in (DaySlide). */
  title: React.ReactNode;
  /** Off on the Settings screen itself. */
  showSettingsLink?: boolean;
  children?: React.ReactNode;
}) {
  const quiet =
    "focus-ring flex h-11 items-center rounded-md px-2 text-sm text-muted-foreground hover:text-foreground";
  return (
    <header className="relative mb-8">
      {/* Its own Suspense: it needs the login, which only exists per
          request, and it shouldn't hold up the header. */}
      <Suspense fallback={null}>
        <DemoChip />
      </Suspense>
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl leading-tight font-bold tabular-nums">{title}</h1>
        <div className="-mr-2 flex items-center">
          {showSettingsLink && (
            <Link href="/settings" className={quiet}>
              Settings
            </Link>
          )}
          <LogOutButton className={quiet} />
        </div>
      </div>
      {children}
    </header>
  );
}

/**
 * "Demo account", for the shared demo account only (plans/demo.md).
 * It sits in the empty space above the title (the page's 32 px top
 * padding), out of the layout: next to Settings it squeezed a past day's
 * title ("Wed, Nov 18") onto two lines on a 360 px phone, and here
 * appearing a moment after the page doesn't push anything down.
 */
async function DemoChip() {
  // Wait for a real request first: checking the login reads the clock
  // (is the token expired?), which Next.js refuses while it prerenders a
  // page for prefetching ("encountered the unstable value Date.now()").
  await connection();
  if (!(await isDemoAccount())) return null;
  return (
    <span className="absolute -top-7 left-0 rounded-full border border-border px-2.5 py-0.5 text-label font-medium text-muted-foreground">
      Demo account
    </span>
  );
}
