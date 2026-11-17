import Link from "next/link";
import { ScanBarcode } from "lucide-react";

// The round matcha button in the middle of the tab bar. It's raised a
// little above the bar (negative top margin) so it reads as the main
// action, and the word "Scan" sits under the icon so nobody has to guess.
// How far it sticks up sets two other numbers: the Undo message's position
// (undo-toast.tsx) and pb-above-tab-bar (globals.css). Re-check both if you
// change its size, ring or -mt-7.
export function ScanButton() {
  return (
    <Link
      href="/scan"
      // focus-ring (globals.css) goes round the circle and the word, with
      // a gap, so it shows even though the circle is matcha too.
      className="group focus-ring -mt-7 flex flex-col items-center gap-1 rounded-full"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background transition-transform group-active:scale-95">
        <ScanBarcode aria-hidden="true" className="size-6" />
      </span>
      <span className="text-label font-medium text-muted-foreground group-hover:text-foreground">
        Scan
      </span>
    </Link>
  );
}
