// THE APP ICON: the macro ring. The ring from the app, split into three
// equal pieces for protein, carbs and fat: protein solid white, carbs and
// fat a softer white, on matcha green. No letters, so a rename doesn't need a new icon.
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
 * can be cut down to a circle 80% as wide as the square, so everything
 * drawn must stay within 40% of the width from the centre. The drawing's
 * square is cropped to the ring, and a ring leaves that square's corners
 * empty, so it's the ring that must fit, not the square: at 0.66 its outer
 * edge sits 33% from the centre, the same size as the other icons, with
 * room to spare. The limit is 0.8 (the ring would touch the 40% circle).
 */
const DRAWING_SCALE: Record<IconShape, number> = { rounded: 0.66, full: 0.66, maskable: 0.66 };

export function AppIcon({ size, shape }: { size: number; shape: IconShape }) {
  // Rounded to an even number of pixels, so the margins on both sides are
  // whole and the ring sits exactly in the middle (0.66 x 192 = 126.7
  // would round to 127, leaving it half a pixel off-centre).
  const drawing = Math.round((size * DRAWING_SCALE[shape]) / 2) * 2;
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
 * Where the three gaps are, in SVG degrees (0 = 3 o'clock, clockwise):
 * 12, 4 and 8 o'clock, so the three pieces are equal (120 degrees each).
 */
const GAP_ANGLES = [-90, 30, 150] as const;

/**
 * The macro ring: one circle (centre 50,50, radius 28, stroke 13) drawn as
 * three equal arcs that meet at the gaps: protein from 12 to 4 o'clock,
 * carbs from 4 to 8, fat from 8 back to 12.
 *
 * The gaps are then cut by bars in the field green laid across the ring.
 * A bar has parallel sides, so each gap is the same 6 units wide from the
 * inside of the ring to the outside. (Leaving out a few degrees of arc
 * would instead give gaps that are narrow inside and wide outside.) 6, not
 * 5, so a gap is still about 1.7 px at the smallest home-screen size (29 px). Each
 * bar is drawn once at 3 o'clock, from 20 to 36 out from the centre, past
 * both edges of the ring (21.5 and 34.5), and turned into place.
 *
 * The viewBox is cropped to the ring (34.5 from the centre), so the ring
 * fills the drawing. The bars poke 1.5 past it, into the crop, unseen.
 */
function RingDrawing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="15.5 15.5 69 69">
      {/* Protein: -90° to 30° */}
      <path d="M50 22 A28 28 0 0 1 74.25 64" fill="none" stroke={ICON_WHITE} strokeWidth={13} />
      {/* Carbs: 30° to 150° */}
      <path d="M74.25 64 A28 28 0 0 1 25.75 64" fill="none" stroke={ICON_SOFT_WHITE} strokeWidth={13} />
      {/* Fat: 150° to 270° */}
      <path d="M25.75 64 A28 28 0 0 1 50 22" fill="none" stroke={ICON_SOFT_WHITE} strokeWidth={13} />
      {GAP_ANGLES.map((angle) => (
        <rect key={angle} x={70} y={47} width={16} height={6} fill={ICON_GREEN} transform={`rotate(${angle} 50 50)`} />
      ))}
    </svg>
  );
}
