"use client";

// The folded summary: one big calories ring with "kcal left" inside, and a
// row of small rings with one number each. Without a target (or on a past
// day) the same numbers sit in the same places, just without circles.

import { totalNumber, type Total } from "@/lib/day-totals";
import type { Slot } from "@/lib/summary";
import { kcalHeadline, type Progress } from "@/lib/targets";
import { ProgressRing } from "./progress-ring";

const BIG = 176;
// 52 px, so four fit side by side even on a 320 px phone.
const SMALL = 52;
// The small rings start filling just after the big one, one by one.
const STAGGER = 0.06;

export function SummaryRings({
  kcalTotal,
  kcal,
  slots,
}: {
  kcalTotal: Total;
  /** Progress against the calorie target, or null for no big ring. */
  kcal: Progress | null;
  slots: Slot[];
}) {
  // If any slot has a ring, the others keep a ring-sized gap so every
  // number lines up on one row.
  const anyRing = slots.some((s) => s.fraction !== null);

  return (
    <div>
      {kcal ? (
        <BigRing p={kcal} />
      ) : (
        <p className="mt-1 text-primary">
          <span className="text-5xl font-bold tabular-nums">{totalNumber(kcalTotal)}</span>
          <span className="ml-1.5 text-base font-medium">kcal</span>
        </p>
      )}

      <ul
        className={`mt-6 grid gap-3 text-center tabular-nums ${slots.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
      >
        {slots.map((slot, i) => (
          <li key={slot.key} className="flex flex-col items-center">
            {slot.fraction !== null ? (
              <ProgressRing
                fraction={slot.fraction}
                size={SMALL}
                stroke={6}
                delay={0.15 + i * STAGGER}
              />
            ) : (
              anyRing && <div aria-hidden="true" style={{ height: SMALL }} />
            )}
            <span
              className={`font-medium ${anyRing ? "mt-2" : ""} ${
                slot.key === "protein" && slot.known ? "text-primary" : ""
              } ${slot.known ? "" : "text-muted-foreground"}`}
            >
              {slot.known ? (
                slot.short
              ) : (
                // A bare "—" may be read as nothing by screen readers.
                <>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">unknown</span>
                </>
              )}
            </span>
            <span className="text-[13px] text-muted-foreground">{slot.word}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "860 kcal left" inside the ring, in matcha, or "120 kcal over" in plain
 * ink (never red). "up to" / "at least" sits small above when some foods
 * have no calories. The ring stays full once you're over.
 */
function BigRing({ p }: { p: Progress }) {
  const { prefix, number, suffix } = kcalHeadline(p);
  // Six characters ("10,000") don't fit inside the ring at 48 px.
  const size = number.length >= 6 ? "text-[40px]" : "text-5xl";
  return (
    <div className="relative mx-auto mt-3" style={{ width: BIG, height: BIG }}>
      <ProgressRing fraction={p.fraction} size={BIG} stroke={12} />
      <p
        className={`absolute inset-0 flex flex-col items-center justify-center transition-colors duration-150 ${
          p.over ? "text-foreground" : "text-primary"
        }`}
      >
        {prefix && <span className="text-[13px] font-medium">{prefix}</span>}
        <span className={`${size} leading-none font-bold tabular-nums`}>{number}</span>
        <span className="mt-1 text-[13px] font-medium">{suffix}</span>
      </p>
    </div>
  );
}
