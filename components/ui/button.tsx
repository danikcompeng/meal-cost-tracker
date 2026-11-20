import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
// Our cn (lib/utils.ts), not the package's: it knows text-label is a
// size, so the small button below keeps its text colour.
import { cn } from "@/lib/utils"

// Two kinds of "can't press it now":
// - Busy ("Saving…"): disabled + focusableWhenDisabled. Stays full
//   colour, because its words are the only sign something is happening,
//   and keeps keyboard focus.
// - Unavailable (Save while a delete runs): add data-unavailable too.
//   Greyed with a colour, not faded with opacity, so the text stays
//   readable (5.4:1) and the focus ring around it stays solid.
// press (globals.css): shrinks to 0.97 while pressed, but not in either
// state above. A full-width button adds press-wide (0.985) to its
// className instead: cn swaps one for the other (lib/utils.ts). It replaces transition-all, which would also have animated
// a change of size or padding (plans/motion.md, item 6).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap press select-none focus-ring disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground data-unavailable:pointer-events-none data-unavailable:border-transparent data-unavailable:bg-muted data-unavailable:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Hover at 90%, not shadcn's 80%: white text on 80% matcha is
        // only 3.9:1, on 90% it's 4.8:1.
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        // A 10% red tint in both modes: red text on it is 5.2:1. shadcn's
        // 20% (dark) was 4.3:1, and its darker hover tints went down to
        // 3.6:1, so hover underlines instead of changing the colour.
        destructive:
          "bg-destructive/10 text-destructive underline-offset-4 hover:underline",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-label in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-md in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-md in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
