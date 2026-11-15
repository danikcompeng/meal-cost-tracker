import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// "Tired of this?" under a recipe's big number, and in Today's edit sheet
// for a recipe entry. Opens the swap stack. type="button": inside the edit
// form, a plain button would submit it.
export function SwapButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className={cn("h-11 w-full text-base", className)}>
      <Shuffle aria-hidden="true" className="size-4" />
      Tired of this?
    </Button>
  );
}
