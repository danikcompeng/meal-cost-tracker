import { formatMoney, proteinPerDollarNumber } from "@/lib/cost";
import { formatNumber, roundForDisplay } from "@/lib/format";
import type { RankedSwap } from "@/lib/swap";
import { amountText, unitWord } from "@/lib/units";

// One card in the swap stack: what you'd eat instead. No state; the stack
// moves it around. On screen, top to bottom:
//   (Similar protein) ($0.50 cheaper)
//   Lentil dal
//   Cost per serving
//   $0.62                     -$0.50
//   25 g protein · 480 kcal · 40 g per $
//   Red lentils · Rice · Onion · +3
//   Last had 5 days ago
// A screen reader reads the name first, then the reasons: someone jumping
// from heading to heading lands on the name and must still hear why.

// Grams and kcal by the display rule (lib/format.ts).
const grams = (v: number) => formatNumber(v, "g");
const kcal = (v: number) => formatNumber(v, "kcal");

/** How many ingredient chips fit before "+3". */
const CHIPS = 3;

export function SwapCard({
  swap,
  servings,
  backdrop,
}: {
  swap: RankedSwap;
  servings: number;
  /**
   * Drawn on the card's background, under all its text: the swipe tint
   * (swipe-feedback.tsx). Absolutely placed (inset-0).
   */
  backdrop?: React.ReactNode;
}) {
  const { shown, foods } = swap;
  // "Shown as 1" (unitWord's rule), so a saved 1.004 says "per serving" too.
  const costLabel =
    unitWord(servings, "serving") === "serving"
      ? "Cost per serving"
      : `Cost for ${amountText(servings, "serving")}`;
  const extra = foods.length - CHIPS;

  return (
    // In dark mode the card is one step lighter than the sheet it sits on
    // (bg-card inside a surface-raised sheet, globals.css). The border is
    // a quiet edge on top of that.
    // The backdrop is placed absolutely over the card's background; the
    // content box after it is positioned too (relative), so it's painted
    // later, on top: the text sits on the tint, never under it. No
    // z-index needed (lib/layers.test.ts). overflow-hidden: the backdrop
    // follows the rounded corners.
    <article
      aria-labelledby={`swap-${swap.id}`}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      {backdrop}
      <div className="relative p-5">
        {/* Name first in the code, chips first on screen ("order-first"
            moves only how it looks). */}
        <div className="flex flex-col">
          <h3 id={`swap-${swap.id}`} className="text-2xl leading-tight font-bold break-words">
            {swap.name}
          </h3>
          {swap.reasons.length > 0 && (
            <ul aria-label="Why this one" className="order-first mb-3 flex flex-wrap gap-1.5">
              {swap.reasons.map((reason) => (
                <li
                  key={reason}
                  className="rounded-full bg-inset px-2.5 py-1 text-label font-medium text-primary tabular-nums"
                >
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-label font-medium text-muted-foreground">{costLabel}</p>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-5xl leading-tight font-bold text-primary tabular-nums">
            <Value value={shown.cost} format={formatMoney} />
          </p>
          {swap.costChange !== null && (
            <p className="text-label text-muted-foreground tabular-nums">
              {signedMoney(swap.costChange)}
              <span className="sr-only"> vs now</span>
            </p>
          )}
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat
            label="protein"
            className="text-primary"
            value={<Value value={shown.protein} format={(v) => `${grams(v)} g`} />}
            change={swap.proteinChange === null ? null : `${signed(swap.proteinChange, grams)} g`}
          />
          <Stat label="kcal" value={<Value value={shown.kcal} format={kcal} />} />
          <Stat
            label="protein per $"
            value={<Value value={swap.proteinPerDollar} format={(v) => `${proteinPerDollarNumber(v)} g`} />}
          />
        </dl>

        {swap.notes.map((note) => (
          <p key={note} className="mt-2 text-label text-muted-foreground">
            {note}
          </p>
        ))}

        {foods.length > 0 && (
          <ul aria-label="Ingredients" className="mt-4 flex flex-wrap gap-1.5">
            {foods.slice(0, CHIPS).map((food) => (
              <li
                key={food.id}
                className="max-w-40 truncate rounded-full border border-border px-2.5 py-0.5 text-label text-muted-foreground"
              >
                {food.name}
              </li>
            ))}
            {extra > 0 && (
              <li className="rounded-full border border-border px-2.5 py-0.5 text-label text-muted-foreground tabular-nums">
                +{extra}
                <span className="sr-only"> more</span>
              </li>
            )}
          </ul>
        )}

        {swap.lastHad && <p className="mt-3 text-label text-muted-foreground">{swap.lastHad}</p>}
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  change = null,
  className,
}: {
  label: string;
  value: React.ReactNode;
  change?: string | null;
  className?: string;
}) {
  return (
    // On screen: the number, its word under it, then the change ("25 g",
    // "protein", "+1 g"). Read aloud: "protein, 25 g, +1 g vs now".
    // CSS "order" moves only how it looks; the reading order stays.
    <div className="flex flex-col">
      <dt className="order-2 text-label text-muted-foreground">{label}</dt>
      <dd className={`order-1 text-lg font-medium tabular-nums ${className ?? ""}`}>{value}</dd>
      {change && (
        <dd className="order-3 text-label text-muted-foreground tabular-nums">
          {change}
          <span className="sr-only"> vs now</span>
        </dd>
      )}
    </div>
  );
}

/** "—" on screen, "unknown" for screen readers, never a made-up number. */
function Value({ value, format }: { value: number | null; format: (v: number) => string }) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">unknown</span>
      </>
    );
  }
  return <>{format(value)}</>;
}

// "+1", "-20", "±0" style changes. Rounded first, so -0.4 shows "0", not "-0".
function signed(value: number, format: (v: number) => string): string {
  // A change too small to show is "0", not "+<0.1".
  if (roundForDisplay(Math.abs(value), "g") === 0) return "0";
  const shown = format(Math.abs(value));
  return `${value < 0 ? "-" : "+"}${shown}`;
}

function signedMoney(value: number): string {
  const cents = Math.round(value * 100);
  if (cents === 0) return "same";
  return `${cents < 0 ? "-" : "+"}${formatMoney(Math.abs(cents) / 100)}`;
}
