"use client";

// "Tired of this?": your other recipes as a stack of cards, best match
// first. This part keeps track of which card you're on and what to say;
// SwapStack does the swiping, SwapCard draws one card.
//
// The ranking runs right here in the browser, from data the page already
// loaded, so the sheet opens instantly with no loading state.

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronLeft } from "lucide-react";
import type { Recipe } from "@/lib/types";
import {
  hadThisWeek,
  lastEatenByRecipe,
  rankSwaps,
  swapCandidates,
  swapHeaderNotes,
  type EatenRow,
  type RankedSwap,
  type SwapCurrent,
} from "@/lib/swap";
import { BottomSheet } from "./bottom-sheet";
import { SwapEmpty, SwapEnd } from "./swap-empty";
import { SwapStack } from "./swap-stack";

/** At most this many cards peek out behind the top one. */
const PEEKS = 2;
/** "Past the last card", in place of a recipe id. */
const END = "end";

export function SwapSheet({
  current,
  recipes,
  history,
  today,
  servings,
  pickLabel,
  dragLabel,
  pendingLabel = null,
  onTop,
  onPick,
  onClose,
}: {
  current: SwapCurrent;
  /** All your recipes; the current one and empty ones are left out here. */
  recipes: Recipe[];
  /** What you ate lately; null if it didn't load (recency is then skipped). */
  history: EatenRow[] | null;
  today: string;
  /** The servings you'll get: the logged entry's, or 1. */
  servings: number;
  pickLabel: string;
  dragLabel: string;
  /** Set while a pick is under way ("Opening…"). */
  pendingLabel?: string | null;
  /** Called with each card as it comes to the top (to get it ready). */
  onTop?: (swap: RankedSwap) => void;
  onPick: (swap: RankedSwap) => void;
  onClose: () => void;
}) {
  const ranked = useMemo(
    () =>
      rankSwaps(current, swapCandidates(recipes, current.recipeId), {
        today,
        servings,
        lastEaten: history && lastEatenByRecipe(history, today),
        kitchen: history && hadThisWeek(history, recipes, today),
      }),
    [current, recipes, history, today, servings],
  );

  // Which card is on top, by recipe id rather than by position: if the
  // list is ever worked out again while the sheet is open, you stay on the
  // same recipe instead of whatever slid into that position.
  const [topId, setTopId] = useState<string>(() => ranked[0]?.id ?? END);
  // What screen readers hear after a card changes.
  const [announcement, setAnnouncement] = useState("");
  const skipRef = useRef<HTMLButtonElement>(null);

  const found = ranked.findIndex((s) => s.id === topId);
  const index = topId === END ? ranked.length : Math.max(found, 0);
  const swap = ranked[index] as RankedSwap | undefined;
  const others = recipes.filter((r) => r.id !== current.recipeId);

  // Tell the page when a card comes to the top. The ref holds the latest
  // onTop, so a new function each render doesn't call it again.
  const onTopRef = useRef(onTop);
  useEffect(() => {
    onTopRef.current = onTop;
  });
  useEffect(() => {
    if (swap) onTopRef.current?.(swap);
  }, [swap]);

  /**
   * Show card `next` (ranked.length = the end tile). `focusSkip` moves
   * keyboard focus to Skip straight after: Back on the first card hides
   * itself, and Start over removes itself, and focus on a hidden or
   * removed button would fall out to the page. flushSync makes React draw
   * the new card first, so Skip is there to receive it.
   */
  function goTo(next: number, focusSkip = false) {
    const card = ranked[next];
    flushSync(() => {
      setTopId(card ? card.id : END);
      setAnnouncement(
        card
          ? `${card.name}, ${next + 1} of ${ranked.length}. ${card.reasons.join(", ")}`
          : `That's all ${ranked.length} of your other recipes.`,
      );
    });
    if (focusSkip) skipRef.current?.focus();
  }

  return (
    <BottomSheet title={`Instead of ${current.name}`} onClose={onClose}>
      {/* A card flying off the side would otherwise make the sheet scroll
          sideways. "clip" (not "hidden") cuts it off at the sheet's edge
          without turning this box into a scroll area of its own; -mx-4
          px-4 lets the card reach the edge before it's cut. */}
      <div className="-mx-4 overflow-x-clip px-4 pt-2">
        {ranked.length === 0 ? (
          <SwapEmpty kind={others.length === 0 ? "none" : "no-ingredients"} />
        ) : (
          <>
            {swapHeaderNotes(current).map((note) => (
              <p key={note} className="mb-2 text-[13px] text-muted-foreground">
                {note}
              </p>
            ))}

            <div className="mb-2 flex h-11 items-center justify-between">
              {/* Hidden, not removed, on the first card, so the counter
                  doesn't jump sideways. */}
              <button
                type="button"
                onClick={() => goTo(index - 1, index - 1 === 0)}
                disabled={pendingLabel !== null}
                className={`-ml-2 flex h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground ${
                  index === 0 ? "invisible" : ""
                }`}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Back
              </button>
              {swap && (
                <p className="text-[13px] text-muted-foreground tabular-nums">
                  {index + 1} of {ranked.length}
                </p>
              )}
            </div>

            {swap ? (
              <SwapStack
                swap={swap}
                servings={servings}
                behind={Math.min(PEEKS, ranked.length - index - 1)}
                pickLabel={pickLabel}
                dragLabel={dragLabel}
                pendingLabel={pendingLabel}
                skipRef={skipRef}
                onCommit={(direction) => {
                  if (direction === "pick") onPick(swap);
                  else goTo(index + 1);
                }}
              />
            ) : (
              <SwapEnd
                count={ranked.length}
                currentName={current.name}
                onRestart={() => goTo(0, true)}
                onKeep={onClose}
              />
            )}
          </>
        )}
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
    </BottomSheet>
  );
}
