import Link from "next/link";
import { signOut } from "@/lib/auth-actions";

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
    "flex h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground";
  return (
    <header className="mb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[30px] leading-tight font-semibold">{title}</h1>
        <div className="-mr-2 flex items-center">
          {showSettingsLink && (
            <Link href="/settings" className={quiet}>
              Settings
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className={quiet}>
              Log out
            </button>
          </form>
        </div>
      </div>
      {children}
    </header>
  );
}
