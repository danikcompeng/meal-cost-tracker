import Link from "next/link";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/cost";
import { missingNote, totalNumber, type DayTotals, type Total } from "@/lib/day-totals";
import {
  hasAnyTarget,
  kcalHeadline,
  ofTarget,
  progress,
  type Progress,
  type Targets,
} from "@/lib/targets";

// The summary tile. Calories is the ONE big number on this screen (design
// rule 1): what's left of your target today, or what you've eaten when
// there's no target or it's a past day. Protein comes next in matcha, then
// carbs and fat, and cost is last in small grey. Missing values are never
// counted as 0: each total is what's known, with a note saying how many
// foods are missing it.
//
// Past days get no bars: targets aren't stored per day yet, so an old day
// would be judged against a target you set later.
export function DaySummary({
  totals,
  isToday,
  targets,
}: {
  totals: DayTotals;
  isToday: boolean;
  targets: Targets;
}) {
  const kcal = isToday ? progress(totals.kcal, targets.daily_kcal) : null;

  // When nothing is known the big number is "—" (or the whole target), so
  // a "+ 2 foods" note would read oddly; say what's going on instead.
  const kcalNote =
    totals.kcal.sum === null
      ? "None of these foods have calories yet"
      : missingNote(totals.kcal.missing, "calories");
  const costNote = missingNote(totals.cost.missing, "a price");

  return (
    <section aria-labelledby="summary-label" className="rounded-2xl bg-card p-5">
      <h2 id="summary-label" className="text-[13px] font-medium text-muted-foreground">
        {kcal ? "Calories today" : isToday ? "Eaten today" : "Eaten this day"}
      </h2>

      {kcal ? (
        <KcalLeft total={totals.kcal} p={kcal} />
      ) : (
        <p className="mt-1 text-primary">
          <span className="font-heading text-5xl font-semibold">{totalNumber(totals.kcal)}</span>
          <span className="ml-1.5 text-base font-medium">kcal</span>
        </p>
      )}
      {kcalNote && <p className="mt-1 text-[13px] text-muted-foreground">{kcalNote}</p>}

      <ul className="mt-5 space-y-3 tabular-nums">
        <MacroRow
          label="Protein"
          total={totals.protein_g}
          target={isToday ? targets.daily_protein_g : null}
          highlight
        />
        <MacroRow label="Carbs" total={totals.carbs_g} target={isToday ? targets.daily_carbs_g : null} />
        <MacroRow label="Fat" total={totals.fat_g} target={isToday ? targets.daily_fat_g : null} />
      </ul>

      <p className="mt-5 text-[13px] text-muted-foreground tabular-nums">
        {totals.cost.sum === null
          ? "No prices yet for these foods"
          : `${isToday ? "Today costs" : "This day cost"} ${formatMoney(totals.cost.sum)}`}
        {totals.cost.sum !== null && costNote && <span className="block">{costNote}</span>}
      </p>

      {!hasAnyTarget(targets) && (
        <Link
          href="/settings"
          className="-mb-2 inline-flex h-11 items-center font-medium text-primary hover:underline"
        >
          Set daily targets
        </Link>
      )}
    </section>
  );
}

/** "860 kcal left" in matcha, or "120 kcal over" in plain ink (never red). */
function KcalLeft({ total, p }: { total: Total; p: Progress }) {
  const { prefix, number, suffix } = kcalHeadline(p);
  return (
    <>
      <p className={p.over ? "mt-1 text-foreground" : "mt-1 text-primary"}>
        {prefix && <span className="mr-1.5 text-base font-medium">{prefix}</span>}
        <span className="font-heading text-5xl font-semibold">{number}</span>
        <span className="ml-1.5 text-base font-medium">{suffix}</span>
      </p>
      <Bar fraction={p.fraction} className="mt-3" />
      <p className="mt-2 text-[13px] text-muted-foreground tabular-nums">
        {ofTarget(total, p.target)} eaten
      </p>
    </>
  );
}

function MacroRow({
  label,
  total,
  target,
  highlight,
}: {
  label: string;
  total: Total;
  target: number | null;
  highlight?: boolean;
}) {
  const p = progress(total, target);
  const known = total.sum !== null;
  // Only protein gets "Goal reached": more protein is the point of this app,
  // more carbs or fat isn't something to celebrate.
  const reached = highlight && p?.reached && known;

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className={highlight ? "font-semibold text-primary" : "font-semibold"}>{label}</span>
        <span>
          {p ? `${ofTarget(total, p.target)} g` : known ? `${totalNumber(total)} g` : "—"}
          {reached && <span className="font-medium text-primary"> · Goal reached</span>}
        </span>
      </div>
      {p && <Bar fraction={p.fraction} className="mt-1.5" />}
      {total.missing > 0 && known && (
        <span className="mt-1 block text-right text-[13px] text-muted-foreground">
          + {total.missing} unknown
        </span>
      )}
    </li>
  );
}

/**
 * A thin progress bar. Hidden from screen readers, because the amount is
 * always written out next to it. It grows with scaleX (a transform), which
 * Framer Motion skips when your phone asks for reduced motion.
 */
function Bar({ fraction, className }: { fraction: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`h-1.5 overflow-hidden rounded-full bg-background ${className ?? ""}`}>
      <motion.div
        className="h-full origin-left rounded-full bg-matcha-soft"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: fraction }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
