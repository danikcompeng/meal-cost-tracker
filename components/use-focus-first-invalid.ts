"use client";

// After a save comes back with a box to fix ("Type an amount"), move focus
// to the first red box, and shake the red boxes once.
//
// Why focus: the error only shows as a red line under the box. Someone
// using a screen reader, still on the Save button, would hear nothing at
// all. Moving focus there makes it read the box's label, "invalid", and
// the error (linked with aria-describedby), and the cursor is ready to fix
// it.
//
// Why shake (plans/motion.md, item 3): it says "no" the way a person
// would, and it shakes again for the same mistake twice, where the red
// line alone wouldn't change. A save that failed for another reason (no
// connection, the server down: the red line under the form) shakes the
// button you pressed instead. Both only for a new answer from the server,
// so it never shakes on a redraw. No shake with Reduce Motion (shake.ts).

import { useEffect, useRef, type RefObject } from "react";
import { shake, shakeTarget } from "./shake";

type Answer = { ok: boolean; message?: string | null; fieldErrors?: Partial<Record<string, string>> };

export function useFocusFirstInvalid(form: RefObject<HTMLFormElement | null>, answer: Answer) {
  // The button that sent the form (Save, Log in, Add): the browser says
  // which one with each submit, the Return key included.
  const submitter = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = form.current;
    if (!element) return;
    const remember = (e: SubmitEvent) => {
      submitter.current = e.submitter;
    };
    element.addEventListener("submit", remember, { capture: true });
    return () => element.removeEventListener("submit", remember, { capture: true });
  }, [form]);

  useEffect(() => {
    if (answer.ok) return;
    const element = form.current;
    if (!element) return;
    if (answer.fieldErrors && Object.values(answer.fieldErrors).some(Boolean)) {
      const boxes = [...element.querySelectorAll<HTMLElement>('[aria-invalid="true"]')];
      boxes[0]?.focus();
      shake(boxes.map(shakeTarget));
    } else if (answer.message) {
      const button = submitter.current ?? element.querySelector<HTMLElement>('[type="submit"]');
      if (button) shake([button]);
    }
    // Only for a new answer from the server, not on every redraw.
  }, [answer, form]);
}
