// Grey shapes in the same places as the real screen, so nothing jumps
// around when your day loads. The pulse is skipped if you've asked your
// phone for reduced motion (motion-safe).
export function TodaySkeleton() {
  const block = "rounded-2xl bg-card motion-safe:animate-pulse";
  return (
    <div aria-busy="true" aria-label="Loading your day">
      <div className="mb-8 space-y-3">
        <div className="h-9 w-32 rounded-lg bg-card motion-safe:animate-pulse" />
        <div className="h-5 w-48 rounded-lg bg-card motion-safe:animate-pulse" />
      </div>
      <div className={`${block} h-52`} />
      <div className="mt-8 space-y-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-24 rounded-lg bg-card motion-safe:animate-pulse" />
            <div className={`${block} h-14`} />
          </div>
        ))}
      </div>
    </div>
  );
}
