import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "today", href: "/", label: "Today" },
  { id: "foods", href: "/foods", label: "Foods" },
] as const;

// Fixed to the bottom of the screen, where your thumb is. The active tab
// gets the butter-yellow pill (the only place butter is used).
export function TabBar({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg justify-around px-4 py-2">
        {TABS.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={tab.id === active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center rounded-full px-6 text-base font-medium transition-colors",
                tab.id === active
                  ? "bg-highlight text-highlight-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
