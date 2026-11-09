import { formatMoney } from "@/lib/cost";
import { missingNote, totalNumber, type DayTotals } from "@/lib/day-totals";

// The summary tile. Calories is the ONE big number on this screen (design
// rule 1); protein comes second in matcha, then carbs and fat, and cost is
// last in small grey. Missing values are never counted as 0: each total is
// what's known, with a note saying how many foods are missing it.
export function DaySummary({ totals, isToday }: { totals: DayTotals; isToday: boolean }) {
  // When nothing is known the big number is "—", so a "+ 2 foods" note
  // would read oddly; say what's going on instead.
  const kcalNote =
    totals.kcal.sum === null
      ? "None of these foods have calories yet"
      : missingNote(totals.kcal.missing, "calories");
  const costNote = missingNote(totals.cost.missing, "a price");

  return (
    <section aria-labelledby="summary-label" className="rounded-2xl bg-card p-5">
      <h2 id="summary-label" className="text-[13px] font-medium text-muted-foreground">
        {isToday ? "Eaten today" : "Eaten this day"}
      </h2>

      <p className="mt-1 text-primary">
        <span className="font-heading text-5xl font-semibold">{totalNumber(totals.kcal)}</span>
        <span className="ml-1.5 text-base font-medium">kcal</span>
      </p>
      {kcalNote && <p className="mt-1 text-[13px] text-muted-foreground">{kcalNote}</p>}

      <ul className="mt-5 grid grid-cols-3 gap-3 tabular-nums">
        <Macro total={totals.protein_g} label="protein" highlight />
        <Macro total={totals.carbs_g} label="carbs" />
        <Macro total={totals.fat_g} label="fat" />
      </ul>

      <p className="mt-5 text-[13px] text-muted-foreground tabular-nums">
        {totals.cost.sum === null
          ? "No prices yet for these foods"
          : `${isToday ? "Today costs" : "This day cost"} ${formatMoney(totals.cost.sum)}`}
        {totals.cost.sum !== null && costNote && <span className="block">{costNote}</span>}
      </p>
    </section>
  );
}

function Macro({
  total,
  label,
  highlight,
}: {
  total: DayTotals["protein_g"];
  label: string;
  highlight?: boolean;
}) {
  const known = total.sum !== null;
  return (
    <li>
      <span className={highlight ? "font-semibold text-primary" : "font-semibold"}>
        {known ? `${totalNumber(total)} g` : "—"}
      </span>{" "}
      <span className="text-muted-foreground">{label}</span>
      {total.missing > 0 && known && (
        <span className="block text-[13px] text-muted-foreground">+ {total.missing} unknown</span>
      )}
    </li>
  );
}
