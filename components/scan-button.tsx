import Link from "next/link";
import { ScanBarcode } from "lucide-react";

// The round matcha button in the middle of the tab bar. It's raised a
// little above the bar (negative top margin) so it reads as the main
// action, and the word "Scan" sits under the icon so nobody has to guess.
export function ScanButton() {
  return (
    <Link
      href="/scan"
      className="group -mt-7 flex flex-col items-center gap-1 rounded-full outline-none"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background transition-transform group-focus-visible:ring-ring/50 group-active:scale-95">
        <ScanBarcode aria-hidden="true" className="size-6" />
      </span>
      <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground">
        Scan
      </span>
    </Link>
  );
}
