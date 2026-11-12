import Link from "next/link";
import { ScanButton } from "./scan-button";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "today", href: "/", label: "Today" },
  { id: "foods", href: "/foods", label: "Foods" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Fixed to the bottom of the screen, where your thumb is. The active tab
// gets the butter-yellow pill (the only place butter is used). Scan sits in
// the middle as the one filled button: it's the main thing you do when
// unpacking groceries.
// `active` is left out on screens that aren't tabs, like Settings.
export function TabBar({ active }: { active?: TabId }) {
  const [today, foods] = TABS;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3 items-center px-4 py-2">
        <li className="justify-self-center">
          <Tab tab={today} active={active} />
        </li>
        <li className="justify-self-center">
          <ScanButton />
        </li>
        <li className="justify-self-center">
          <Tab tab={foods} active={active} />
        </li>
      </ul>
    </nav>
  );
}

function Tab({ tab, active }: { tab: (typeof TABS)[number]; active?: TabId }) {
  return (
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
  );
}
