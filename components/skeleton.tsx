// Shared pieces for loading skeletons: quiet grey shapes in the same
// places as the real screen, so nothing jumps when the data arrives.
// Never a spinner, never a number (a 0 while loading would look real).
// The pulse is skipped if you've asked your phone for reduced motion
// (motion-safe).

/** A grey shape on the page (the tiles' grey). */
export const onPage = "bg-card motion-safe:animate-pulse";
/** A lighter shape inside a grey tile. */
export const onTile = "bg-background motion-safe:animate-pulse";

/**
 * Wraps a skeleton. Screen readers find "Loading your day…" as real text
 * in a status (an aria-label on a plain div, as before, is skipped by
 * most of them). The shapes are empty, so there's nothing else to read.
 * No aria-busy: on a status it means "hold your announcements until I'm
 * done", and this one is never done, it's just replaced.
 */
export function Skeleton({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * One line of text: `line` is the real line's height (so the layout
 * matches), the grey bar inside it is a little thinner, like text.
 */
export function TextLine({
  line = "h-6",
  bar = "h-4",
  width,
  shade = onPage,
  className = "",
}: {
  line?: string;
  bar?: string;
  width: string;
  shade?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center ${line} ${className}`}>
      <div className={`rounded ${bar} ${width} ${shade}`} />
    </div>
  );
}

/**
 * A form field: its label (14 px tall, like the real Label), then a 44 px
 * box. `shade` is onTile inside a grey tile, onPage on the page itself.
 */
export function FieldShape({
  labelWidth = "w-16",
  shade = onTile,
}: {
  labelWidth?: string;
  shade?: string;
}) {
  return (
    <div className="space-y-1.5">
      <TextLine line="h-3.5" bar="h-3" width={labelWidth} shade={shade} />
      <div className={`h-11 rounded-lg ${shade}`} />
    </div>
  );
}
