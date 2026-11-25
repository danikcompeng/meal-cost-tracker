"use client";

// Foods: your list first, with a "New food" button over it, like "New
// recipe" on Recipes. The form opens in place (on its tile, sliding open
// while the button folds away) when you tap New food, or tap a food to
// edit it, and closes again after Save or Cancel. With no foods yet it
// starts open: there's nothing to look up, only something to add.
//
// Holds the shared state: is the form open, and which food (if any) is
// being edited. The form and the list both need to know.
import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, useIsPresent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CollapseIn } from "./collapse";
import { FoodForm } from "./food-form";
import { FoodList } from "./food-list";
import type { Food } from "@/lib/types";

export function FoodManager({ foods, startOpen = false }: { foods: Food[]; startOpen?: boolean }) {
  const [editing, setEditing] = useState<Food | null>(null);
  // Adding a new food (opened with New food, or from "Add it on Foods").
  const [adding, setAdding] = useState(startOpen || foods.length === 0);

  // The food you were editing was deleted (its trash button is still in
  // the list): there's nothing left to save, so the form closes.
  if (editing && !foods.some((food) => food.id === editing.id)) {
    setEditing(null);
  }

  const formShown = adding || editing !== null;
  // With no foods there's nothing behind the form to go back to.
  const canClose = foods.length > 0 || editing !== null;

  // Each time the form opens (New food, or another food to edit) is a new
  // "session". A save is slow (the server): if you've opened another form
  // since, its answer mustn't close that one. The form only closes if
  // it's still the session that saved.
  const [session, setSession] = useState(0);
  const sessionRef = useRef(0);
  function openSession() {
    sessionRef.current += 1;
    setSession(sessionRef.current);
  }

  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  // Set when the form closes: was focus inside it (a keyboard, or a
  // screen reader)? Then it goes to New food, instead of falling to the
  // top of the page with the button that was pressed. A tap on an iPhone
  // never focuses a button, so a tap leaves this false and no focus ring
  // appears on New food afterwards.
  const focusNewAfterClose = useRef(false);

  function startEditing(food: Food) {
    openSession();
    setEditing(food);
    setAdding(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAdding() {
    openSession();
    setAdding(true);
  }

  function close() {
    focusNewAfterClose.current = sectionRef.current?.contains(document.activeElement) ?? false;
    setEditing(null);
    setAdding(false);
  }

  // Next.js keeps a page you leave on hand, state and all, to show it
  // again instantly (Cache Components). Foods opened with "?new" (from
  // "Add it on Foods") should open on the form every time, so it's put
  // back when the page is hidden. Plain Foods keeps how you left it.
  useLayoutEffect(() => {
    return () => {
      if (startOpen) {
        setEditing(null);
        setAdding(true);
      }
    };
  }, [startOpen]);

  // Focus follows the form: when it opens (or switches to another food),
  // to its heading ("Add a food", "Edit Rolled oats"), not left behind on
  // a row far below; when it closes, to New food (see focusNewAfterClose).
  // The heading is invisible, so no ring can show on a phone.
  const shownBefore = useRef(formShown);
  const editingBefore = useRef(editing);
  useEffect(() => {
    const opened = formShown && (!shownBefore.current || editing !== editingBefore.current);
    if (opened) {
      headingRef.current?.focus({ preventScroll: true });
    } else if (shownBefore.current && !formShown && focusNewAfterClose.current) {
      focusNewAfterClose.current = false;
      newRef.current?.focus({ preventScroll: true });
    }
    shownBefore.current = formShown;
    editingBefore.current = editing;
  }, [formShown, editing]);

  return (
    <div className="space-y-6">
      <section ref={sectionRef} aria-labelledby={formShown ? "food-form-title" : undefined}>
        {/* For screen readers only, and only while the form is open: the
            form itself shows which food it holds. tabIndex -1 lets code
            move focus here; Tab skips it. */}
        {formShown && (
          <h2 ref={headingRef} id="food-form-title" tabIndex={-1} className="sr-only">
            {editing ? `Edit ${editing.name}` : "Add a food"}
          </h2>
        )}
        {/* The button folds away as the form opens, and back: one space
            that changes height smoothly, so the list below doesn't hop. */}
        <AnimatePresence initial={false}>
          {formShown ? (
            <CollapseIn key="form">
              <LeavingIsInert>
                {/* 16 px more below the form than below the button (40 px
                    to the list, as before), inside the opening box so it
                    opens with it. */}
                <div className="pb-4">
                  {/* Changing the key gives the form a fresh start for
                      each food. */}
                  <FoodForm
                    key={editing?.id ?? "new"}
                    editing={editing}
                    onDone={() => {
                      // Only if this is still the form that saved. A
                      // transition, so the form closes together with the
                      // refreshed list arriving, not a moment before it.
                      if (sessionRef.current === session) startTransition(close);
                    }}
                    onCancel={canClose ? close : undefined}
                  />
                </div>
              </LeavingIsInert>
            </CollapseIn>
          ) : (
            // -m-1 / p-1: 4 px of room inside the folding box (it hides
            // what sticks out) for the button's focus ring, 2 px out plus
            // 2 px thick. The button stays exactly where it was.
            <CollapseIn key="new" className="-m-1">
              <div className="p-1">
                <Button ref={newRef} onClick={startAdding} className="press-wide h-11 w-full text-base">
                  New food
                </Button>
              </div>
            </CollapseIn>
          )}
        </AnimatePresence>
      </section>

      <section aria-label="Your foods">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {foods.length} {foods.length === 1 ? "food" : "foods"}
        </h2>
        <FoodList foods={foods} editingId={editing?.id ?? null} onEdit={startEditing} />
      </section>
    </div>
  );
}

/**
 * While the form folds away (200 ms) it can't be tapped or focused: a
 * second Save or Cancel in a form that's already closing would act on it
 * after it has gone.
 */
function LeavingIsInert({ children }: { children: React.ReactNode }) {
  const isPresent = useIsPresent();
  return <div inert={!isPresent}>{children}</div>;
}
