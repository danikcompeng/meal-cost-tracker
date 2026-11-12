// Pure helpers for the scanner screen: no camera access happens here.

/** Why the camera couldn't start. Each one gets its own screen. */
export type CameraProblem =
  | "denied" // you (or the phone) said no to camera access
  | "no_camera" // no camera found
  | "busy" // another app is using it
  | "insecure" // the page isn't on https://
  | "unsupported" // this browser can't use cameras at all
  | "reader"; // the camera works, but the barcode reader failed to load

/**
 * Turns the error from getUserMedia (the browser's "give me the camera"
 * call) into one of our problems. Browsers report these as DOMException
 * names, and Safari and Chrome use slightly different ones.
 */
export function cameraProblemFrom(error: unknown): CameraProblem {
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError": // older Chrome
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "no_camera";
    // Anything else (including these) gets "busy, try again": the most
    // useful advice when we don't know. The camera hook logs the real error.
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
    default:
      return "busy";
  }
}

export type Platform = "ios" | "ios_home_screen" | "android" | "other";

/**
 * Which phone you're on, so the "camera is blocked" screen shows only the
 * steps for yours. iPads report themselves as Macs, but Macs have no touch
 * screen, so a "Mac" with touch points is an iPad.
 */
export function platformFrom(userAgent: string, maxTouchPoints: number, standalone: boolean): Platform {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (ios) return standalone ? "ios_home_screen" : "ios";
  if (/Android/.test(userAgent)) return "android";
  return "other";
}

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Which part of the camera picture is inside the scanning frame.
 *
 * The video is shown with "object-fit: cover": scaled up until it fills the
 * screen, with the overflow cut off. So a point on screen isn't the same
 * point in the video. This maps the frame (in screen pixels) back to video
 * pixels, so we only read barcodes you can see inside the frame. That's
 * faster, and ignores other barcodes in view.
 *
 * `margin` grows the area a little (0.15 = 15% each way), so a barcode
 * touching the frame's edge still reads.
 */
export function frameToVideo(
  video: { width: number; height: number },
  view: { width: number; height: number },
  frame: Rect,
  margin = 0.15,
): Rect {
  // "cover" scales by whichever side needs to grow more.
  const scale = Math.max(view.width / video.width, view.height / video.height);
  // How much of the scaled video sticks out past each edge of the screen.
  const offsetX = (video.width * scale - view.width) / 2;
  const offsetY = (video.height * scale - view.height) / 2;

  const grownX = frame.width * margin;
  const grownY = frame.height * margin;
  const left = (frame.x - grownX + offsetX) / scale;
  const top = (frame.y - grownY + offsetY) / scale;
  const right = (frame.x + frame.width + grownX + offsetX) / scale;
  const bottom = (frame.y + frame.height + grownY + offsetY) / scale;

  // Keep it inside the video.
  const x = Math.max(0, Math.round(left));
  const y = Math.max(0, Math.round(top));
  return {
    x,
    y,
    width: Math.min(video.width, Math.round(right)) - x,
    height: Math.min(video.height, Math.round(bottom)) - y,
  };
}
