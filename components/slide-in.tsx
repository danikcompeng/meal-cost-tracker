"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT, SLIDE } from "@/lib/motion";

// Directional slides (plans/motion.md, item 4): new content slides in
// SLIDE (24 px) from the side you moved towards, fading in, 200 ms. Only
// the arrival animates, never the leaving: the old content comes from the
// server, and holding it on screen for a leaving animation would only
// delay the new one.
//
// When it decides: every time the piece is SHOWN, not when it's first
// built. The app keeps pages you visited alive but hidden (Next.js's
// cacheComponents), and going back to one shows it again without building
// it anew. A layout effect runs each time a piece is shown, and before the
// browser draws it, so the slide starts on the very first frame.
//
// Reduce Motion: no sideways move, just the fade.

/** -1: from the left (going back). 1: from the right. 0: no slide. */
type From = -1 | 0 | 1;

/** Slides `element` in from `from`. Gives back a way to finish it at once. */
function slideIn(element: HTMLElement, from: From, reduceMotion: boolean | null) {
  if (from === 0) return null;
  const keyframes = reduceMotion ? { opacity: [0, 1] } : { x: [from * SLIDE, 0], opacity: [0, 1] };
  return animate(element, keyframes, { duration: DURATION.base, ease: EASE_OUT });
}

/** The element the slide moves: a block, or inline for a few words. */
function Box({
  inline,
  boxRef,
  children,
}: {
  inline?: boolean;
  boxRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return inline ? (
    <span ref={boxRef as React.RefObject<HTMLSpanElement>} className="inline-block">
      {children}
    </span>
  ) : (
    <div ref={boxRef as React.RefObject<HTMLDivElement>}>{children}</div>
  );
}

// ----- Previous / next day on Today -----
// The last day shown, kept outside React so every piece of the day reads
// the same one. Only ever set in the browser (in an effect): a fresh page
// load starts at null, so it never slides.
let lastDay: string | null = null;

/**
 * The day's title, date line or content, sliding in from the left when
 * it's an earlier day than the one shown before (‹ Previous day), from
 * the right for a later one (› Next day, Back to today). Browser back and
 * forward work too: it only compares days.
 * Every piece shown together for a new day slides together; one that
 * appears later for the same day (the food loading in after the header)
 * doesn't slide again.
 */
export function DaySlide({
  day,
  inline,
  children,
}: {
  day: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // All the pieces of one redraw read lastDay here first (layout effects)...
  useLayoutEffect(() => {
    if (!ref.current) return;
    // ISO dates ("2026-11-16") compare in calendar order as plain text.
    const from: From = lastDay === null || lastDay === day ? 0 : day < lastDay ? -1 : 1;
    const slide = slideIn(ref.current, from, reduceMotion);
    // Hidden again mid-slide: finish it, so it's never shown half-way.
    return () => slide?.complete();
  }, [day, reduceMotion]);
  // ...and only then is it updated (plain effects run after all of them).
  useEffect(() => {
    lastDay = day;
  }, [day]);
  return (
    <Box inline={inline} boxRef={ref}>
      {children}
    </Box>
  );
}

// ----- Recipes | Foods -----
// Two separate pages, so the switch leaves a one-time note when you tap
// it, saying which page you went to and from which side, and the next
// page's list reads it. Anything else that shows the page (the Kitchen
// tab, a reload, the browser's back button) leaves no note: no slide.
let kitchenNote: { to: string; from: From } | null = null;

/** The Recipes | Foods switch calls this when tapped. */
export function noteKitchenMove(to: string, from: -1 | 1) {
  kitchenNote = { to, from };
}

/** The list under the switch on `page`, sliding in if the switch led here. */
export function KitchenSlide({ page, children }: { page: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const from = kitchenNote?.to === page ? kitchenNote.from : 0;
    // Read once: used up, so coming back another way doesn't slide.
    kitchenNote = null;
    const slide = slideIn(ref.current, from, reduceMotion);
    return () => slide?.complete();
  }, [page, reduceMotion]);
  return <Box boxRef={ref}>{children}</Box>;
}
