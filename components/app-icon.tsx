// THE APP ICON. This is the one file to change when the real icon arrives.
//
// For now it's a placeholder: a plain white bowl on matcha green, with no
// letters, so a rename doesn't need a new icon.
//
// It's never shown on a page. app/icons/[file]/route.tsx turns it into
// the PNG files phones want, once, when the app is built. That's done by
// next/og (Satori), which only understands a small part of CSS: flexbox,
// inline styles and simple SVG. No Tailwind classes here.
//
// To use a real icon later, either:
// - paste its SVG in place of <BowlDrawing /> (keep viewBox="0 0 100 100"),
// - or draw a 1024 x 1024 PNG and return
//   <img src={...} width={size} height={size} /> with the PNG read as a
//   data URL.
import { ICON_GREEN, type IconShape } from "@/lib/app-identity";

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
      <BowlDrawing size={drawing} />
    </div>
  );
}

/** A bowl with two lines of steam, in a 100 x 100 box. */
function BowlDrawing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Steam */}
      <path
        d="M40 36 C34 30 46 24 40 16 M60 36 C54 30 66 24 60 16"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={5}
        strokeLinecap="round"
      />
      {/* Rim */}
      <rect x={12} y={44} width={76} height={7} rx={3.5} fill="#FFFFFF" />
      {/* Bowl: a half circle hanging under the rim */}
      <path d="M17 53 H83 A33 33 0 0 1 17 53 Z" fill="#FFFFFF" />
      {/* Foot */}
      <rect x={37} y={84} width={26} height={6} rx={3} fill="#FFFFFF" />
    </svg>
  );
}
