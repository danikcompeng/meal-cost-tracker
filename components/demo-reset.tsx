"use client";

// "Reset demo" in Settings, for the shared demo account only
// (plans/demo.md). It asks first, on the tile itself (no browser pop-up),
// then puts the sample foods, recipes, meals and targets back and goes
// to Today.

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { keepOnFailure } from "@/lib/action-call";
import { resetDemo } from "@/lib/demo-actions";
import { ErrorLine } from "./collapse";

export function DemoReset() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [resetting, startReset] = useTransition();

  // A failed reset swaps "Yes, reset" back for "Reset demo": focus goes
  // there instead of falling out to the page.
  const resetRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (error && document.activeElement === document.body) resetRef.current?.focus();
  }, [error]);

  function handleReset() {
    setError(undefined);
    startReset(async () => {
      // On success the server sends you to Today, so only a failure
      // comes back here.
      const result = await keepOnFailure(resetDemo, { verb: "reset the demo", retry: "reset it again" })();
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <section aria-labelledby="demo-label" className="mt-6 space-y-3 rounded-2xl bg-card p-4">
      <div>
        <h2 id="demo-label" className="text-label font-medium text-muted-foreground">
          Demo
        </h2>
        <p className="mt-1">
          Everyone who taps Try the demo shares this account. The sample foods and recipes stay as they
          are; add your own to try editing.
        </p>
      </div>
      <ErrorLine show={Boolean(error)} gap="3">
        {error}
      </ErrorLine>
      {confirming ? (
        <div className="space-y-2">
          <p className="text-sm">Put the sample meals back? What anyone added or logged here goes.</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              // Red like every other "Yes, …" that throws things away.
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
              // Keeps keyboard focus while it works.
              focusableWhenDisabled
              className="press h-11 px-4 text-base"
            >
              {resetting ? "Resetting…" : "Yes, reset"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={resetting}
              className="h-11 text-base"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          ref={resetRef}
          type="button"
          variant="outline"
          onClick={() => setConfirming(true)}
          className="press-wide h-11 w-full text-base"
        >
          Reset demo
        </Button>
      )}
    </section>
  );
}
