import Link from "next/link";
import { ScanButton } from "./scan-button";
import { cn } from "@/lib/utils";

// Kitchen holds your recipes and your foods, with a [ Recipes | Foods ]
// switch at the top of both (components/kitchen-switch.tsx). It opens on
// Recipes, the one you'll use more. /foods still works as an address.
const TABS = [
  { id: "today", href: "/", label: "Today" },
  { id: "kitchen", href: "/recipes", label: "Kitchen" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Fixed to the bottom of the screen, where your thumb is. The active tab
// gets the butter-yellow pill (butter only marks where you are). Scan sits
// in the middle as the one filled button: it's the main thing you do when
// unpacking groceries.
// `active` is left out on screens that aren't tabs, like Settings.
export function TabBar({ active }: { active?: TabId }) {
  const [today, kitchen] = TABS;
  return (
    <nav
      aria-label="Main"
      // z-tab-bar: above everything that scrolls (globals.css, Layers).
      className="fixed inset-x-0 bottom-0 z-tab-bar border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3 items-center px-4 py-2">
        <li className="justify-self-center">
          <Tab tab={today} active={active} />
        </li>
        <li className="justify-self-center">
          <ScanButton />
        </li>
        <li className="justify-self-center">
          <Tab tab={kitchen} active={active} />
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
        // px-4, not wider: "Kitchen" (about 58 px of text) still fits its
        // third of a 320 px phone, about 96 px, beside Scan.
        // press: shrinks a little while pressed (globals.css).
        "focus-ring press flex h-11 items-center rounded-full px-4 text-base font-medium",
        tab.id === active
          ? "bg-highlight text-highlight-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {tab.label}
    </Link>
  );
}
