"use client";

// After a save comes back with a box to fix ("Type an amount"), move focus
// to the first red box.
//
// Why: the error only shows as a red line under the box. Someone using a
// screen reader, still on the Save button, would hear nothing at all.
// Moving focus there makes it read the box's label, "invalid", and the
// error (linked with aria-describedby), and the cursor is ready to fix it.

import { useEffect, type RefObject } from "react";

type Answer = { ok: boolean; fieldErrors?: Partial<Record<string, string>> };

export function useFocusFirstInvalid(form: RefObject<HTMLFormElement | null>, answer: Answer) {
  useEffect(() => {
    if (answer.ok || !answer.fieldErrors) return;
    if (!Object.values(answer.fieldErrors).some(Boolean)) return;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    // Only for a new answer from the server, not on every redraw.
  }, [answer, form]);
}
