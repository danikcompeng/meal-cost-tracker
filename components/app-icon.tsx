// THE APP ICON: the macro ring. The ring from the app, split three ways
// for protein, carbs and fat: protein solid white, carbs and fat a softer
// white, on matcha green. No letters, so a rename doesn't need a new icon.
// (It was a placeholder bowl until 2026-11-23. The options it was picked
// from are on the "Bitewise logo" design canvas.)
//
// It's never shown on a page. app/icons/[file]/route.tsx turns it into
// the PNG files phones want, once, when the app is built. That's done by
// next/og (Satori), which only understands a small part of CSS: flexbox,
// inline styles and simple SVG. No Tailwind classes here.
import { ICON_GREEN, ICON_WHITE, type IconShape } from "@/lib/app-identity";

/**
 * How much of the square the drawing takes up. Android's maskable icons
 * can be cut down to a circle 80% as wide as the square, so there the
 * drawing stays smaller: at 0.56, even the corners of the drawing's square
 * sit 39.6% from the centre, just inside the 40% circle. Don't raise it.
 */
const DRAWING_SCALE: Record<IconShape, number> = { rounded: 0.66, full: 0.66, maskable: 0.56 };

export function AppIcon({ size, shape }: { size: number; shape: IconShape }) {
  const drawing = Math.round(size * DRAWING_SCALE[shape]);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ICON_GREEN,
        // Only the browser-tab / "any" icon is rounded here; the others are
        // full squares that the phone cuts to shape itself.
        borderRadius: shape === "rounded" ? size * 0.22 : 0,
      }}
    >
      <RingDrawing size={drawing} />
    </div>
  );
}

/**
 * Half the white over the green, as one solid colour: carbs and fat are
 * drawn softer than protein. Solid rather than see-through so every PNG
 * renderer draws it the same.
 */
const ICON_SOFT_WHITE = mix(ICON_WHITE, ICON_GREEN, 0.5);

function mix(a: string, b: string, amountOfA: number) {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) =>
    Math.round(channel(a, i) * amountOfA + channel(b, i) * (1 - amountOfA))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${out.join("")}`;
}

/**
 * The macro ring: a circle of radius 28 split into three arcs, 14 degrees
 * apart, starting at 12 o'clock and going clockwise. Protein gets the
 * biggest arc. The viewBox is cropped to the ring (radius 28 plus half the
 * 13-wide stroke = 34.5 from the centre), so the ring fills the drawing.
 */
function RingDrawing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="15.5 15.5 69 69">
      {/* Protein */}
      <path d="M53.41 22.21 A28 28 0 0 1 66.85 72.36" fill="none" stroke={ICON_WHITE} strokeWidth={13} />
      {/* Carbs */}
      <path d="M60.94 75.77 A28 28 0 0 1 22.21 53.41" fill="none" stroke={ICON_SOFT_WHITE} strokeWidth={13} />
      {/* Fat */}
      <path d="M22.21 46.59 A28 28 0 0 1 46.59 22.21" fill="none" stroke={ICON_SOFT_WHITE} strokeWidth={13} />
    </svg>
  );
}
