import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Tired of this?" under a recipe's big number. Opens the swap stack.
export function SwapButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="mt-4 h-11 w-full text-base">
      <Shuffle aria-hidden="true" className="size-4" />
      Tired of this?
    </Button>
  );
}
