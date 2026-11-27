"use client";

// A panel that slides up from the bottom of the screen.
//
// It's built on the browser's own <dialog> element opened with showModal().
// That gives a lot for free: Escape closes it, keyboard focus stays inside
// it, and the page behind can't be clicked or read by screen readers while
// it's open. Tapping the dimmed area outside the panel closes it too.

import { useId, useLayoutEffect, useRef } from "react";
import {
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  usePresenceData,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { X } from "lucide-react";
import { DURATION, EASE_IN, EASE_OUT, SHEET_RISE, SPRING } from "@/lib/motion";
import { AutoHeight } from "./collapse";

/**
 * Where a growing sheet starts and shrinks back to: the element's box, if
 * it's on the screen (a row scrolled away, or gone, can't be grown from).
 */
function boxOf(selector: string): DOMRect | null {
  const box = document.querySelector(selector)?.getBoundingClientRect();
  if (!box || box.width === 0 || box.bottom <= 0 || box.top >= window.innerHeight) return null;
  return box;
}

/**
 * The move that lays the panel exactly over `box`, from its top-left
 * corner: x and y to that corner, then squeezed to its width and height.
 */
function onto(box: DOMRect, panel: DOMRect) {
  return {
    x: box.left - panel.left,
    y: box.top - panel.top,
    scaleX: box.width / panel.width,
    scaleY: box.height / panel.height,
  };
}

// Sizes the grow needs in JavaScript (CLAUDE.md: kept as numbers here).
/** A sheet's top corners: rounded-2xl, 18 px. */
const SHEET_CORNER = 18;
/** A Today row's corners: rounded-lg, 10 px. */
const ROW_CORNER = 10;
/** Below this share of its height, a growing sheet's contents are hidden. */
const CONTENT_FROM_SCALE = 0.94;

/**
 * One corner of a growing sheet: `atSheet` px at full size, the row's
 * 10 px at row size (`rowness` 1), divided by the squeeze in each
 * direction so it looks round at every size ("x y" elliptical radius).
 */
function cornerRadius(atSheet: number, rowness: number, scaleX: number, scaleY: number) {
  const radius = atSheet + (ROW_CORNER - atSheet) * rowness;
  return `${radius / scaleX}px ${radius / scaleY}px`;
}

/** Shrinking into the row: arriving, so it slows as it lands. DURATION.base, like CLOSE. */
const SHRINK = { duration: DURATION.base, ease: EASE_OUT };

/**
 * Tells a growing sheet how to leave, through AnimatePresence's `custom`:
 * "slide" when another sheet takes its place (the edit sheet opening the
 * swap stack), so it doesn't shrink into the row while the next one rises.
 */
export type SheetExit = "shrink" | "slide";

// Closing: the sheet slides down off the screen (a fade with Reduce
// Motion) while its dimmed backdrop fades, DURATION.base. For that, every
// sheet is drawn inside an <AnimatePresence>, which keeps it on the page
// until the slide is done. Something that should happen once the sheet
// is out of the way (Today's row sliding after a swap) asks how long that
// still takes.
const CLOSE = { duration: DURATION.base, ease: EASE_IN };
let closedAt = 0;
/** Milliseconds until a sheet that's closing right now has gone (0 if none). */
export function untilSheetClosed(): number {
  return Math.max(0, closedAt - performance.now());
}
/**
 * A sheet starts sliding away now. The sheet says so itself as it closes;
 * a page that closes a sheet AND changes the day in the same go (a
 * delete, a swap) says it first, because its rows read untilSheetClosed()
 * in that same redraw, possibly before the sheet's own effect has run.
 */
export function noteSheetClosing() {
  closedAt = performance.now() + CLOSE.duration * 1000;
}

// The page behind can't scroll while any sheet is open. Counted, not
// saved and restored per sheet: while one sheet slides away another can
// open, in either order, and a sheet saving "hidden" as the value to
// restore would lock the page for good.
let openSheets = 0;
function lockScroll() {
  openSheets += 1;
  document.documentElement.style.overflow = "hidden";
}
function unlockScroll() {
  openSheets = Math.max(0, openSheets - 1);
  if (openSheets === 0) document.documentElement.style.overflow = "";
}

export function BottomSheet({
  title,
  onClose,
  step,
  stepFade,
  growFrom,
  children,
}: {
  title: string;
  onClose: () => void;
  /**
   * A CSS selector for what you tapped (a Today row). The sheet grows out
   * of it instead of sliding up, and shrinks back into it as it closes,
   * so the row and its sheet read as one thing. With Reduce Motion, or
   * if that element isn't on the screen, it slides (or fades) as usual.
   */
  growFrom?: string;
  /**
   * Which step the sheet is on ("pick", a food's id...). When it changes,
   * the sheet's top edge glides to the new height instead of jumping,
   * and the new step fades in (AutoHeight in collapse.tsx).
   */
  step?: string;
  /** Off where the new step has its own entrance (the next swap card). */
  stepFade?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  // Its own id per sheet: while one slides away and another opens, two
  // are on the page, and a shared id would name the new one after the old.
  const titleId = useId();
  // false once the page has closed this sheet: it's sliding away. Back to
  // true if the page opens it again before the slide is over (the same
  // sheet comes back, AnimatePresence keeps it): then it opens again.
  const isPresent = useIsPresent();
  const closing = useRef(false);

  // Growing out of a row (growFrom): the panel moves from the row's box
  // to its place, and back as it closes. Only a transform (x, y and a
  // squeeze from the top-left corner), so it stays smooth on a phone.
  const growing = Boolean(growFrom) && !reduceMotion;
  const exitMode = usePresenceData() as SheetExit | undefined;
  const shrinking = growing && exitMode !== "slide";
  const panelRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  // Squeezed, text would look squashed, so what's in the sheet only shows
  // in the last few percent of its height: tied to the shape, not a
  // timer, so a slow phone or the spring's tail can't show it squashed.
  // It fades out the same way as it shrinks back.
  const contentOpacity = useTransform(scaleY, [CONTENT_FROM_SCALE, 1], [0, 1]);
  // The row's grey over the sheet's white while it's still row-sized: it
  // starts as the row itself lifting out, not a white box appearing.
  // 1 = the row, 0 = the sheet; the corners follow it too.
  const tint = useMotionValue(0);
  // The whole panel, faded as it lands back on the row.
  const opacity = useMotionValue(1);
  // The row's corners (10 px all round) at row size, the sheet's (18 px
  // top, square bottom) at full size, divided by the squeeze so they look
  // round, not flattened, at every size.
  const topCorner = useTransform(() => cornerRadius(SHEET_CORNER, tint.get(), scaleX.get(), scaleY.get()));
  const bottomCorner = useTransform(() => cornerRadius(0, tint.get(), scaleX.get(), scaleY.get()));

  // Open while present; the cleanup is the closing. One effect, keyed on
  // presence, so a sheet brought back mid-slide simply opens again.
  // A layout effect: it runs before the browser paints, and before the
  // page's own effects, so the page still has the last word on focus
  // (Today's "+ Add" after a delete).
  useLayoutEffect(() => {
    if (!isPresent) return;
    const reopened = closing.current;
    closing.current = false;
    const dialog = ref.current;
    // Remember what was focused (the button that opened the sheet), so
    // keyboard and screen-reader users land back there when it closes.
    // The browser would normally do this, but React removes the dialog from
    // the page before closing it, which skips that step.
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    // Start on the title, not the ×. showModal() moves focus into the sheet
    // by code, and for focus moved by code the browser guesses whether to
    // draw a ring; on iPhone it guesses "yes" even after a tap (a tap never
    // focuses the button you tapped, so Safari can't tell it was a tap).
    // The title draws no ring, a screen reader reads it out ("Add to
    // breakfast"), and the first Tab still reaches the ×. tabIndex -1
    // makes the title the first focusable thing in the sheet, so most
    // browsers start there by themselves; this line covers any that pick
    // the × anyway. (A child's own autoFocus can't help: it runs while the
    // sheet is still shut, and focus can't go into a hidden sheet.)
    //
    // A box marked data-autofocus ("New recipe"'s name, the amount when
    // Today opens straight to a scanned food) gets focus instead, now that
    // the sheet is open, so you can type straight away. On an iPhone the
    // keyboard may or may not open by itself: Safari only opens it when
    // the focus comes from a tap (likely for "New recipe", which you tap
    // to open; not after a scan, which opens the page).
    const marked = dialog?.querySelector<HTMLElement>("[data-autofocus]");
    if (marked) marked.focus();
    else if (document.activeElement === closeRef.current) titleRef.current?.focus();
    // Stop the page behind from scrolling while a sheet is open (iPhones
    // otherwise scroll the page when you drag inside the sheet).
    lockScroll();
    // Grow out of the row, measured now, before the first paint, so no
    // frame shows the sheet already in place. Brought back mid-close: it
    // just goes back to its place from wherever it is.
    if (growing && growFrom && panelRef.current) {
      const box = reopened ? null : boxOf(growFrom);
      if (box) {
        const from = onto(box, panelRef.current.getBoundingClientRect());
        x.jump(from.x);
        y.jump(from.y);
        scaleX.jump(from.scaleX);
        scaleY.jump(from.scaleY);
        tint.jump(1);
      } else if (!reopened) {
        // The row isn't on the screen: rise a little, like other sheets.
        y.jump(SHEET_RISE);
      }
      for (const value of [x, y]) animate(value, 0, SPRING.sheet);
      for (const value of [scaleX, scaleY]) animate(value, 1, SPRING.sheet);
      // Ease-in: it stays the row's grey while the panel is still small,
      // then gives way to the sheet's own colour as it reaches full size.
      animate(tint, 0, { duration: DURATION.slow, ease: EASE_IN });
      opacity.jump(1);
    }
    // The page closed it (or it was removed): really close the dialog
    // straight away, and only keep drawing it for the slide (the
    // "closing" look below). An open dialog makes the rest of the page
    // untouchable, so focus couldn't go back to the button that opened it.
    return () => {
      closing.current = true;
      noteSheetClosing();
      dialog?.close();
      unlockScroll();
      // Only if it's still on the page (logging can re-draw the list).
      if (opener?.isConnected) opener.focus();
    };
    // Only on opening and closing: the rest are refs and motion values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  // Shrinking back into the row: the row's grey and corners come back as
  // the panel lands on it (its contents fade with its height), and over
  // the last DURATION.fast the whole panel fades, so the real row shows
  // through as it lands instead of popping in when the panel goes.
  // The move itself is the "leave" exit below.
  useLayoutEffect(() => {
    // Same check as leave() below: no row on screen means it slides.
    if (isPresent || !shrinking || !growFrom || !boxOf(growFrom)) return;
    animate(tint, 1, SHRINK);
    animate(opacity, 0, { duration: DURATION.fast, delay: DURATION.base - DURATION.fast, ease: EASE_IN });
  }, [isPresent, shrinking, growFrom, tint, opacity]);

  // How it leaves, worked out the moment it starts (the row may have
  // moved: another meal, or the list changed). Shrinks into its row;
  // otherwise slides down; with Reduce Motion, fades. Always
  // DURATION.base, which untilSheetClosed() counts on.
  const leave = () => {
    if (reduceMotion) return { opacity: 0, transition: CLOSE };
    const box = shrinking && growFrom ? boxOf(growFrom) : null;
    const panel = panelRef.current?.getBoundingClientRect();
    if (!box || !panel) return { y: "100%", transition: CLOSE };
    return { ...onto(box, panel), transition: SHRINK };
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Sliding away: out of Tab and screen readers too, not just taps.
      inert={!isPresent}
      // "cancel" fires on Escape; let React's state close it instead.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A backup for any other way the browser closes it (e.g. Android's
      // back gesture), so React's state never thinks it's still open.
      //
      // The "is it still shut?" check matters: the browser announces a close
      // a moment AFTER close() runs. In development, React runs every effect
      // twice on purpose (open, close, open again), so the announcement from
      // that practice close arrives after the sheet has re-opened, and
      // without this check it would shut the sheet straight away. A real
      // close leaves the dialog shut, so it still gets through.
      //
      // Not while it's sliding away: the page already closed it, and by
      // then it may have opened another sheet this would close.
      onClose={(e) => {
        if (!e.currentTarget.open && !closing.current) onClose();
      }}
      // A click whose target is the <dialog> itself landed on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget && !closing.current) onClose();
      }}
      className={
        isPresent
          ? "mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg overflow-visible bg-transparent p-0 text-foreground backdrop:bg-scrim"
          : // Sliding away: no longer an open dialog, so drawn by hand where
            // it was (the bottom of the screen, above everything: z-overlay,
            // since it has left the top layer), with a dim layer of its own
            // fading out, and letting taps through.
            "pointer-events-none fixed inset-0 z-overlay m-0 flex h-full max-h-none w-full max-w-none items-end justify-center overflow-visible bg-transparent p-0 text-foreground"
      }
    >
      {/* The dim layer while it slides away: a plain CSS fade from full
          (starting:) to none over DURATION.base. Not a Framer element on
          purpose: one removed mid-fade (the sheet opened again while
          closing) left Framer waiting for it forever, and the next close
          then never took the sheet off the page. On the panel's own curve,
          so the page doesn't light up before the sheet has gone: ease-in
          as it slides away, ease-out as it shrinks into its row. */}
      {!isPresent && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-scrim opacity-0 transition-opacity duration-(--motion-base) starting:opacity-100 ${
            shrinking ? "ease-(--motion-ease-out)" : "ease-(--motion-ease-in)"
          }`}
        />
      )}
      <motion.div
        ref={panelRef}
        // Growing: moved by hand from the row (the effect above), so
        // nothing to start from here.
        initial={growing ? false : { y: SHEET_RISE, opacity: 0 }}
        animate={growing ? undefined : { y: 0, opacity: 1 }}
        transition={SPRING.sheet}
        style={
          growing
            ? {
                x,
                y,
                scaleX,
                scaleY,
                originX: 0,
                originY: 0,
                opacity,
                borderTopLeftRadius: topCorner,
                borderTopRightRadius: topCorner,
                borderBottomLeftRadius: bottomCorner,
                borderBottomRightRadius: bottomCorner,
              }
            : undefined
        }
        variants={{ leave }}
        exit="leave"
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl border border-b-0 border-border bg-popover pb-[env(safe-area-inset-bottom)]"
      >
        {/* The row's grey, fading out as the sheet grows from it. On the
            panel itself, not inside surface-raised, so it's the page's
            tile grey, the row's own. One px past the panel's edge
            (-inset-px), so it covers the sheet's border too: the row has
            none. */}
        {growFrom && (
          <motion.div
            aria-hidden="true"
            style={{ opacity: tint }}
            className="pointer-events-none absolute -inset-px rounded-[inherit] bg-card"
          />
        )}
        {/* surface-raised (globals.css): in dark mode, tiles and hovers
            inside go one step lighter than the sheet. */}
        <motion.div style={{ opacity: contentOpacity }} className="surface-raised relative flex min-h-0 flex-col">
          <div className="flex items-center justify-between px-4 pt-3">
            {/* tabIndex -1: code can focus it (see above), Tab skips it. */}
            <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-lg font-semibold outline-none">
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              // Our matcha ring (focus-ring, globals.css), only for keyboard
              // focus, instead of Safari's built-in blue one.
              className="focus-ring press -mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 pb-4">
            <AutoHeight step={step} fade={stepFade}>
              {children}
            </AutoHeight>
          </div>
        </motion.div>
      </motion.div>
    </dialog>
  );
}
