import Link from "next/link";
import { cn } from "@/lib/utils";

const PAGES = [
  { id: "recipes", href: "/recipes", label: "Recipes" },
  { id: "foods", href: "/foods", label: "Foods" },
] as const;

// [ Recipes | Foods ] at the top of the Kitchen tab. It looks like the
// segmented control, but each side is a link to its own page, so the
// back button, bookmarks and old /foods links all keep working.
// aria-current tells screen readers which page you're on.
export function KitchenSwitch({ current }: { current: (typeof PAGES)[number]["id"] }) {
  return (
    <nav aria-label="Kitchen" className="mt-4 flex rounded-lg border border-border bg-background p-1">
      {PAGES.map((page) => (
        <Link
          key={page.id}
          href={page.href}
          aria-current={page.id === current ? "page" : undefined}
          className={cn(
            // The ring sits in the track's 4 px padding, on white, never
            // on the butter yellow of the current page (too faint there in
            // dark mode).
            // Corners concentric with the track's: 10 px − 1 px border −
            // 4 px padding = 5 px (CLAUDE.md, Layout).
            "focus-ring flex h-11 flex-1 items-center justify-center rounded-[calc(var(--radius-lg)-5px)] text-base transition-colors",
            page.id === current
              ? "bg-highlight font-medium text-highlight-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
