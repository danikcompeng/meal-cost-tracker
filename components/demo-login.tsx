"use client";

// "Try the demo", under the email form on the login page: logs into the
// shared demo account with no email (plans/demo.md). The server does the
// logging in; this button only asks for it.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { keepOnFailure, tapAgain } from "@/lib/action-call";
import { signInDemo } from "@/lib/demo-actions";
import { ErrorLine } from "./collapse";

export function DemoLogin() {
  const [state, formAction, pending] = useActionState(
    // Offline: a message here instead of the error page.
    keepOnFailure(signInDemo, tapAgain("open the demo", "Try the demo")),
    { ok: false },
  );
  return (
    <form action={formAction} className="mt-6">
      {/* "or", on a thin line, so it reads as the other way in. */}
      <div className="mb-6 flex items-center gap-3 text-label text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        focusableWhenDisabled
        className="press-wide h-11 w-full"
      >
        {pending ? "Opening the demo…" : "Try the demo"}
      </Button>
      <p className="mt-2 text-center text-label text-muted-foreground">
        A shared account with sample meals. No email needed.
      </p>
      <ErrorLine show={Boolean(!pending && state.message)} gap="2">
        {state.message}
      </ErrorLine>
    </form>
  );
}
