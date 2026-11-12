import { describe, expect, it } from "vitest";
import { cameraProblemFrom, frameToVideo, platformFrom } from "./camera";

const error = (name: string) => Object.assign(new Error("x"), { name });

describe("cameraProblemFrom", () => {
  it("knows a refused permission", () => {
    expect(cameraProblemFrom(error("NotAllowedError"))).toBe("denied");
    expect(cameraProblemFrom(error("PermissionDeniedError"))).toBe("denied");
  });

  it("knows a missing camera", () => {
    expect(cameraProblemFrom(error("NotFoundError"))).toBe("no_camera");
    expect(cameraProblemFrom(error("OverconstrainedError"))).toBe("no_camera");
  });

  it("knows a camera another app is using", () => {
    expect(cameraProblemFrom(error("NotReadableError"))).toBe("busy");
  });

  it("treats anything unexpected as busy (try again)", () => {
    expect(cameraProblemFrom(new Error("weird"))).toBe("busy");
    expect(cameraProblemFrom("nope")).toBe("busy");
  });
});

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("platformFrom", () => {
  it("tells iPhone in Safari from iPhone home-screen app", () => {
    expect(platformFrom(IPHONE, 5, false)).toBe("ios");
    expect(platformFrom(IPHONE, 5, true)).toBe("ios_home_screen");
  });

  it("spots an iPad pretending to be a Mac", () => {
    expect(platformFrom(IPAD, 5, false)).toBe("ios");
    expect(platformFrom(IPAD, 0, false)).toBe("other"); // a real Mac
  });

  it("knows Android and everything else", () => {
    expect(platformFrom(ANDROID, 5, false)).toBe("android");
    expect(platformFrom(WINDOWS, 0, false)).toBe("other");
  });
});

describe("frameToVideo", () => {
  it("maps the frame straight across when video and screen match", () => {
    const frame = { x: 40, y: 300, width: 320, height: 180 };
    expect(frameToVideo({ width: 400, height: 800 }, { width: 400, height: 800 }, frame, 0)).toEqual(
      frame,
    );
  });

  it("accounts for the video being scaled up and cut off at the sides", () => {
    // A landscape 1280 x 720 video on a 390 x 844 phone screen: scaled by
    // 844 / 720 = 1.172 to fill the height, so 1500 px wide, 555 px of which
    // stick out on each side.
    const crop = frameToVideo(
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
      { x: 39, y: 340, width: 312, height: 164 },
      0,
    );
    // The frame covers the middle 312 px of the screen = 266 video px.
    expect(crop.width).toBe(266);
    expect(crop.x).toBe(507); // (39 + 555) / 1.172
    expect(crop.y).toBe(290); // 340 / 1.172
    expect(crop.height).toBe(140);
  });

  it("grows the area by the margin but never past the video's edges", () => {
    const crop = frameToVideo(
      { width: 400, height: 800 },
      { width: 400, height: 800 },
      { x: 0, y: 0, width: 400, height: 200 },
      0.15,
    );
    expect(crop).toEqual({ x: 0, y: 0, width: 400, height: 230 });
  });
});
