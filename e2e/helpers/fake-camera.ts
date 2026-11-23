// A stand-in camera for the demo recording.
//
// The recording browser has no camera, so the scan screen would say "The
// camera is busy". Scanning a real barcode can't be filmed this way
// anyway, so the video shows "Type the number" instead, and this gives
// the scanner something calm to show for the second before: a blurry,
// slowly drifting countertop, like a phone camera pointed at a kitchen
// bench. The barcode reader finds nothing in it.
//
// Runs inside the page (page.addInitScript), before the app's own code.

export function fakeCamera() {
  const media = navigator.mediaDevices;
  if (!media?.getUserMedia) return;
  const real = media.getUserMedia.bind(media);
  media.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    if (!constraints?.video) return real(constraints);
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d")!;
    const start = performance.now();
    const draw = () => {
      const t = (performance.now() - start) / 1000;
      // A soft warm light that drifts a little, as a held phone does.
      const light = ctx.createRadialGradient(
        360 + Math.sin(t * 0.6) * 40, 560 + Math.cos(t * 0.5) * 30, 60,
        360, 640, 900,
      );
      light.addColorStop(0, "#6b6258");
      light.addColorStop(0.55, "#3d3832");
      light.addColorStop(1, "#1d1b19");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    draw();
    const stream = canvas.captureStream(30);
    // Stops painting once the scanner lets go of the camera: the app
    // moves on without loading a new page, so the timer would run on.
    const timer = setInterval(() => {
      if (stream.getVideoTracks()[0]?.readyState === "ended") clearInterval(timer);
      else draw();
    }, 33);
    return stream;
  };
}
