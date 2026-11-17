"use client";

// "Log out" in the header. Its own small browser component (the header
// runs on the server) so that logging out offline shows a short message
// under it instead of the error page. Online, signOut's redirect to the
// login screen goes through as before.

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { keepOnFailure } from "@/lib/action-call";
import { signOut } from "@/lib/auth-actions";

type LogOutState = { ok: boolean; message?: string };

export function LogOutButton({ className }: { className: string }) {
  const [state, formAction, pending] = useActionState(
    keepOnFailure(async (): Promise<LogOutState> => {
      await signOut();
      // Not reached: signOut always redirects. Here so the answer has the
      // same shape as a failure.
      return { ok: true };
    }, { verb: "log out", retry: "log out again" }),
    { ok: true },
  );
  // The message hangs over the page (so the header doesn't jump), which
  // means it covers what's under it: it closes with its ×, and by itself
  // when the phone is back online.
  const [dismissed, setDismissed] = useState<LogOutState | null>(null);
  useEffect(() => {
    const backOnline = () => setDismissed(state);
    window.addEventListener("online", backOnline);
    return () => window.removeEventListener("online", backOnline);
  }, [state]);
  // Hidden while trying again, so a second failure shows (and is read
  // out) again instead of looking like nothing happened.
  const message = !pending && dismissed !== state ? state.message : undefined;

  return (
    <form
      action={formAction}
      // aria-disabled, not disabled, while it works: disabled would push
      // keyboard focus off the button (same as Start over on login).
      onSubmit={(e) => {
        if (pending) e.preventDefault();
      }}
      className="relative"
    >
      <button type="submit" aria-disabled={pending} className={className}>
        {pending ? "Logging out…" : "Log out"}
      </button>
      {message && (
        // No shadow in dark mode: there, being one step lighter
        // (surface-raised) is what lifts it off the page.
        <div className="surface-raised absolute top-full right-0 z-10 flex w-64 items-start gap-1 rounded-lg border border-border bg-popover py-1 pl-3 shadow-sm dark:shadow-none">
          <p role="alert" className="flex-1 py-2 text-[13px] text-destructive">
            {message}
          </p>
          <button
            type="button"
            onClick={() => setDismissed(state)}
            aria-label="Dismiss"
            className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </form>
  );
}
