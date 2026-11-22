import { Suspense } from "react";
import Link from "next/link";
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
    <header className="mb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl leading-tight font-bold tabular-nums">{title}</h1>
        <div className="-mr-2 flex items-center">
          {/* Its own Suspense: it needs the login, which only exists per
              request, and it shouldn't hold up the header. It sits left of
              the links, so appearing doesn't move them. */}
          <Suspense fallback={null}>
            <DemoChip />
          </Suspense>
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

/** "Demo", for the shared demo account only (plans/demo.md). */
async function DemoChip() {
  if (!(await isDemoAccount())) return null;
  return (
    <span className="mr-1 rounded-full border border-border px-2.5 py-0.5 text-label font-medium text-muted-foreground">
      Demo
    </span>
  );
}
