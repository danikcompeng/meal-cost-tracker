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
      {/* The summary tile: a big ring, a row of small ones, the details
          button and the cost line, as grey shapes. */}
      <div className="rounded-2xl bg-card p-5" aria-hidden="true">
        <div className="h-4 w-28 rounded bg-background motion-safe:animate-pulse" />
        <div className="mx-auto mt-3 size-44 rounded-full border-[12px] border-background motion-safe:animate-pulse" />
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="size-13 rounded-full border-[6px] border-background motion-safe:animate-pulse" />
              <div className="h-4 w-10 rounded bg-background motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mx-auto mt-6 h-4 w-32 rounded bg-background motion-safe:animate-pulse" />
      </div>
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
