import { FieldShape, Skeleton, TextLine, onPage, onTile } from "./skeleton";

// Foods while it loads: the add-food tile (food-form.tsx) and the list
// under it, as grey shapes at their real heights.
export function FoodsSkeleton() {
  return (
    <Skeleton label="Loading your foods…" className="space-y-10">
      <div className="space-y-6 rounded-2xl bg-card p-4">
        <FieldShape labelWidth="w-12" />
        <FieldShape labelWidth="w-12" />
        {/* Measured by: its small label and the segmented control. */}
        <div>
          <TextLine line="mb-1.5 h-5" bar="h-3" width="w-24" shade={onTile} />
          <div className={`h-13.5 rounded-lg ${onTile}`} />
        </div>
        {/* Nutrition: the four main boxes, two by two. */}
        <div>
          <TextLine line="mb-3 h-5" bar="h-3" width="w-32" shade={onTile} />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <FieldShape key={i} />
            ))}
          </div>
          {/* "More nutrients", folded, then the calorie hint line (20 px
              even when empty). */}
          <TextLine line="mt-3 h-11" width="w-32" shade={onTile} />
          <div className="mt-3 h-5" />
        </div>
        {/* What you paid: price and package size. */}
        <div>
          <TextLine line="mb-3 h-5" bar="h-3" width="w-24" shade={onTile} />
          <div className="grid grid-cols-2 gap-3">
            <FieldShape labelWidth="w-10" />
            <FieldShape labelWidth="w-20" />
          </div>
          {/* The "= $0.70 per 100 g" line, 20 px even when empty. */}
          <div className="mt-3 h-5" />
        </div>
        <div className={`h-11 rounded-lg ${onTile}`} />
      </div>

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
