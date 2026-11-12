// The unfolded part of the summary: exact amounts against targets, the
// "+ N unknown" notes, and sugar, fiber, sat fat and sodium.

import { hasAnyExtra, totalNumber, type DayTotals } from "@/lib/day-totals";
import type { Slot } from "@/lib/summary";
import { ofTarget, type Progress } from "@/lib/targets";

export function SummaryDetails({
  totals,
  kcal,
  slots,
}: {
  totals: DayTotals;
  kcal: Progress | null;
  slots: Slot[];
}) {
  const kcalKnown = totals.kcal.sum !== null;
  return (
    <div className="space-y-5">
      <ul className="space-y-3 tabular-nums">
        <Row
          label="Calories"
          amount={
            kcal
              ? `${ofTarget(totals.kcal, kcal.target)} kcal`
              : kcalKnown
                ? `${totalNumber(totals.kcal)} kcal`
                : "—"
          }
          missing={kcalKnown ? totals.kcal.missing : 0}
        />
        {slots.map((slot) => (
          <Row
            key={slot.key}
            label={slot.word[0].toUpperCase() + slot.word.slice(1)}
            amount={slot.detail}
            missing={slot.missing}
            highlight={slot.key === "protein"}
            reached={slot.reached}
          />
        ))}
      </ul>

      {hasAnyExtra(totals) && <ExtraNutrients totals={totals} />}
    </div>
  );
}

function Row({
  label,
  amount,
  missing,
  highlight,
  reached,
}: {
  label: string;
  amount: string;
  missing: number;
  highlight?: boolean;
  reached?: boolean;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className={highlight ? "font-semibold text-primary" : "font-semibold"}>{label}</span>
        <span>
          {amount}
          {reached && <span className="font-medium text-primary"> · Goal reached</span>}
        </span>
      </div>
      {missing > 0 && (
        <span className="mt-1 block text-right text-[13px] text-muted-foreground">
          + {missing} unknown
        </span>
      )}
    </li>
  );
}

const EXTRAS = [
  { key: "sugar_g", unit: "g", word: "sugar" },
  { key: "fiber_g", unit: "g", word: "fiber" },
  { key: "saturated_fat_g", unit: "g", word: "sat fat" },
  { key: "sodium_mg", unit: "mg", word: "sodium" },
] as const;

/**
 * The quiet four, small and grey: "12 g sugar", with the value doing the
 * work instead of a "Sugar:" label. No targets. A nutrient none of the
 * day's foods have shows "— sodium".
 */
function ExtraNutrients({ totals }: { totals: DayTotals }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] tabular-nums">
      {EXTRAS.map(({ key, unit, word }) => {
        const total = totals[key];
        const known = total.sum !== null;
        return (
          <li key={key}>
            {known ? (
              <span className="font-medium">{`${totalNumber(total)} ${unit}`}</span>
            ) : (
              // A bare "—" may be read as nothing by screen readers.
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  —
                </span>
                <span className="sr-only">unknown</span>
              </>
            )}{" "}
            <span className="text-muted-foreground">{word}</span>
            {total.missing > 0 && known && (
              <span className="block text-muted-foreground">+ {total.missing} unknown</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
