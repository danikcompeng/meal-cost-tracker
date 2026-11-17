import Link from "next/link";
import { LogOutButton } from "./log-out-button";

// Settings is a quiet grey link up here rather than a tab: you set your
// targets once and rarely come back.
export function AppHeader({
  title,
  showSettingsLink = true,
  children,
}: {
  title: string;
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
