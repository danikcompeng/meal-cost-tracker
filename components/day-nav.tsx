import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayLabel } from "@/lib/dates";
import { DaySlide } from "./slide-in";

const hrefFor = (day: string, today: string) => (day === today ? "/" : `/?day=${day}`);

// ‹ Monday, November 9 ›  (no › on today: future days are for planning,
// which comes later).
export function DayNav({ day, today }: { day: string; today: string }) {
  const prev = addDays(day, -1);
  const next = addDays(day, 1);
  const arrow =
    "focus-ring press flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <nav aria-label="Choose day" className="-ml-3 mt-1 flex items-center">
      <Link href={hrefFor(prev, today)} className={arrow} aria-label="Previous day">
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Link>
      {/* The date slides in with the day; the arrows around it stay put,
          so tapping ‹ three times hits the same spot each time. */}
      <span className="text-label font-medium text-muted-foreground">
        <DaySlide day={day} inline>
          {dayLabel(day)}
        </DaySlide>
      </span>
      {day < today ? (
        <Link href={hrefFor(next, today)} className={arrow} aria-label="Next day">
          <ChevronRight aria-hidden="true" className="size-5" />
        </Link>
      ) : (
        // Keeps the layout steady when there's no next arrow.
        <span className="size-11" aria-hidden="true" />
      )}
      {day < today && (
        <Link
          href="/"
          className="focus-ring ml-auto flex h-11 items-center rounded-md text-sm font-medium text-primary"
        >
          Back to today
        </Link>
      )}
    </nav>
  );
}
