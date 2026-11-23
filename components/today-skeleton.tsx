import { Skeleton, TextLine, onPage, onTile } from "./skeleton";

// Today while it loads: grey shapes the same size as the real header,
// summary tile and meals (heights match app-header, day-nav, day-summary,
// summary-rings and meal-section, today-view), so nothing jumps when your
// day arrives.
//
// It's drawn as an empty day ("Nothing logged yet", four "+ Add"
// buttons), the first thing you see most mornings. What it can't know
// yet still moves a little when the day arrives: a day with entries (the
// meals grow), no calorie target (no big ring, and a "Set daily targets"
// link), or details left open.
export function TodaySkeleton({
  past = false,
  withHeader = true,
}: {
  /** A past day: no rings at all, just the numbers (summary-rings.tsx). */
  past?: boolean;
  /** Off once the real header is already on screen (app/page.tsx). */
  withHeader?: boolean;
}) {
  return (
    <Skeleton label="Loading your day…">
      {/* Header: the day's title with Settings and Log out on the right,
          then the day arrows and date (44 px tall, like the real ones). */}
      {withHeader && (
        <div className="mb-8">
          <div className="flex h-11 items-center justify-between">
            <div className={`h-9 w-36 rounded-lg ${onPage}`} />
            <div className={`h-4 w-28 rounded ${onPage}`} />
          </div>
          <TextLine line="mt-1 h-11" width="w-40" />
        </div>
      )}

      {/* The summary tile: label, big ring (or on a past day the plain
          48 px calories number), the row of small slots, the "Show
          details" button and the cost line. */}
      <div className="rounded-2xl bg-card p-5">
        <TextLine line="h-5" bar="h-3" width="w-28" shade={onTile} />
        {past ? (
          <TextLine line="mt-1 h-12" bar="h-10" width="w-32" shade={onTile} />
        ) : (
          <div className="mx-auto mt-3 size-44 rounded-full border-12 border-inset motion-safe:animate-pulse" />
        )}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              {!past && (
                <div className="mb-2 size-13 rounded-full border-6 border-inset motion-safe:animate-pulse" />
              )}
              <TextLine line="h-6" width="w-10" shade={onTile} />
              <TextLine line="h-5" bar="h-3" width="w-12" shade={onTile} />
            </div>
          ))}
        </div>
        <TextLine line="mx-auto mt-3 h-11 w-fit" width="w-28" shade={onTile} />
        <TextLine line="mx-auto h-5 w-fit" bar="h-3" width="w-36" shade={onTile} />
      </div>

      {/* "Nothing logged yet today. Tap a meal to add what you ate.": two
          lines on a phone. */}
      <div className="mt-6 flex flex-col items-center">
        <TextLine width="w-64" />
        <TextLine width="w-44" />
      </div>

      {/* The four meal tiles: a label, then a 44 px block where the real
          "+ Add to breakfast" button goes (meal-section.tsx). */}
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-card p-2">
            <TextLine line="mt-1 mb-1 h-6 px-3" width="w-20" shade={onTile} />
            <div className={`h-11 rounded-lg ${onTile}`} />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
