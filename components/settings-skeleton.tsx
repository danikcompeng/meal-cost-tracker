import { FieldShape, Skeleton, TextLine, onTile } from "./skeleton";

// Settings while it loads: the Daily targets tile (targets-form.tsx) as
// grey shapes at their real heights, so the form doesn't jump in.
export function SettingsSkeleton() {
  return (
    <Skeleton label="Loading your targets…">
      <div className="space-y-5 rounded-2xl bg-card p-4">
        <div>
          <TextLine line="h-5" bar="h-3" width="w-24" shade={onTile} />
          <TextLine line="mt-1 h-6" width="w-52" shade={onTile} />
        </div>
        {/* Calories, protein, carbs, fat. */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <FieldShape key={i} />
          ))}
        </div>
        {/* Water: its label, the switch row, the goal box. */}
        <div className="space-y-3">
          <TextLine line="mb-3 h-5" bar="h-3" width="w-12" shade={onTile} />
          <TextLine line="h-11" width="w-40" shade={onTile} />
          <div className="w-1/2 pr-1.5">
            <FieldShape />
          </div>
        </div>
        {/* The hint line, Save, and the "Saved" line under it. */}
        <div className="h-5" />
        <div className={`h-11 rounded-lg ${onTile}`} />
        <div className="h-5" />
      </div>
    </Skeleton>
  );
}
