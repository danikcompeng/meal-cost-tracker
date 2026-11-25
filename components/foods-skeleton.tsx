import { Skeleton, TextLine, onPage } from "./skeleton";

// Foods while it loads: the "New food" button and the list under it, as
// grey shapes at their real heights (food-manager.tsx). With no foods the
// real screen opens on the form instead, but that's a first visit only.
export function FoodsSkeleton() {
  return (
    <Skeleton label="Loading your foods…" className="space-y-6">
      <div className={`h-11 rounded-lg ${onPage}`} />

      <div>
        <TextLine line="mb-2 h-5" bar="h-3" width="w-16" />
        {[0, 1, 2, 3].map((i) => (
          // A food row on a phone: name, the macro line (it wraps onto a
          // second line below about 512 px wide) and price, with py-3.
          <div key={i} className={`mb-px h-30 rounded-lg ${onPage}`} />
        ))}
      </div>
    </Skeleton>
  );
}
