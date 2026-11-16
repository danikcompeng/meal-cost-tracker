import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Today before you have any foods: there's nothing to log until you've
// added one. "Add your first food" carries data-first-use, so Today can
// put keyboard focus on it after deleting your last entry lands you here.
export function FirstUse() {
  return (
    <section className="rounded-2xl bg-card px-5 py-10 text-center">
      <h2 className="text-lg font-semibold">Start with the foods you buy</h2>
      <p className="mx-auto mt-2 max-w-xs text-muted-foreground">
        Add a food or two, with what you paid and the macros from the label. Then log what you eat
        here.
      </p>
      <Link href="/foods" data-first-use className={cn(buttonVariants(), "mt-6 h-11 px-6 text-base")}>
        Add your first food
      </Link>
      <p className="mt-3 text-sm text-muted-foreground">
        or{" "}
        <Link href="/scan" className="focus-ring rounded-sm font-medium text-primary">
          scan a barcode
        </Link>
      </p>
    </section>
  );
}
