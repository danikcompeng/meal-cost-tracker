"use client";

// The camera and barcode reading behind the scan screen.
//
// What it does, in order:
// 1. Asks for the back camera (the browser shows its permission prompt
//    the first time).
// 2. About 8 times a second, copies the part of the picture inside the
//    frame onto a hidden canvas and asks the reader for barcodes there.
// 3. When the same valid code is read twice in a row, it copies the whole
//    picture onto the snapshot canvas (so the screen "freezes"), turns the
//    camera OFF and reports the code.
//
// The camera is also turned off when you leave the page, lock the phone or
// switch apps, and back on when you return. A camera left running drains
// the battery and keeps the camera light on.

import { useEffect, useRef, useState, type RefObject } from "react";
import { confirmRead, normalizeBarcode } from "@/lib/barcode";
import { createReader, type Reader } from "@/lib/barcode-reader";
import { cameraProblemFrom, frameToVideo, type CameraProblem } from "@/lib/camera";

export type CameraStatus = "starting" | "scanning" | "read";

const SCAN_EVERY_MS = 120;
const SLOW_HINT_AFTER_MS = 8000;

// Torch isn't in TypeScript's built-in camera types yet (it's Chrome-only).
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

export function useBarcodeCamera({
  videoRef,
  frameRef,
  snapshotRef,
  onDetected,
  onProblem,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  frameRef: RefObject<HTMLDivElement | null>;
  snapshotRef: RefObject<HTMLCanvasElement | null>;
  onDetected: (barcode: string) => void;
  onProblem: (problem: CameraProblem) => void;
}) {
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [slow, setSlow] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  // Bumped to start the camera again after the page was hidden.
  const [attempt, setAttempt] = useState(0);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // The latest callbacks, read inside the long-running loop without
  // restarting the camera every time the parent re-renders.
  const callbacks = useRef({ onDetected, onProblem });
  useEffect(() => {
    callbacks.current = { onDetected, onProblem };
  });

  useEffect(() => {
    // `cancelled` stops everything below if the effect is cleaned up
    // while we're still waiting (for permission, or the reader to load).
    let cancelled = false;
    // True once a code was read or a problem reported: from then on the
    // scan screen has moved on, so coming back to the app mustn't restart
    // the camera behind it.
    let finished = false;
    let loggedDetectError = false;
    let stream: MediaStream | null = null;
    let loopTimer: ReturnType<typeof setTimeout> | undefined;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;

    const stopCamera = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      trackRef.current = null;
    };

    const fail = (problem: CameraProblem) => {
      stopCamera();
      if (cancelled) return;
      finished = true;
      callbacks.current.onProblem(problem);
    };

    async function start() {
      // Cameras only work on https:// (or localhost). Opening the dev
      // server on a phone by IP address (http://192.168...) lands here.
      if (!window.isSecureContext) return fail("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return fail("unsupported");

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          // "ideal" = prefer the back camera, but use any camera rather
          // than fail (laptops only have a front one).
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (error) {
        // Logged so "camera is busy" on a real phone can be traced back to
        // the browser's own reason.
        console.error("Camera didn't start:", error);
        return fail(cameraProblemFrom(error));
      }
      if (cancelled) return stopCamera();

      const video = videoRef.current;
      if (!video) return stopCamera();
      video.srcObject = stream;
      try {
        await video.play();
      } catch (error) {
        // iPhones can refuse to play until the video is muted and inline,
        // which it is; a failure here is rare and the loop still tries.
        console.error("Camera video didn't start playing:", error);
      }
      // Closed or hidden while play() was starting: stopCamera() has
      // already emptied `stream`, so stop here before using it.
      if (cancelled || !stream) return stopCamera();

      const track = stream.getVideoTracks()[0] ?? null;
      trackRef.current = track;
      const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
      setTorchAvailable(Boolean(capabilities?.torch));

      let reader: Reader;
      try {
        reader = await createReader();
      } catch (error) {
        console.error("Barcode reader failed to load:", error);
        return fail("reader");
      }
      if (cancelled) return stopCamera();

      setStatus("scanning");
      slowTimer = setTimeout(() => setSlow(true), SLOW_HINT_AFTER_MS);
      scan(reader, document.createElement("canvas"), null, true);
    }

    async function scan(reader: Reader, canvas: HTMLCanvasElement, previous: string | null, first: boolean) {
      if (cancelled) return;
      const video = videoRef.current;
      const frame = frameRef.current;
      let current: string | null = null;

      if (video && frame && video.readyState >= 2 && video.videoWidth > 0) {
        drawFrameArea(video, frame, canvas);
        try {
          const codes = await reader.detect(canvas);
          for (const code of codes) {
            current = normalizeBarcode(code.rawValue, code.format);
            if (current) break;
          }
        } catch (error) {
          // The very first read loads the WebAssembly file. If that fails
          // (offline the first time you scan), the reader can't work.
          if (first) {
            console.error("Barcode reader failed:", error);
            return fail("reader");
          }
          // Later failures are usually one bad frame; keep scanning, but
          // log the first one so a reader that keeps failing shows up.
          if (!loggedDetectError) {
            console.error("Barcode reader failed on a frame:", error);
            loggedDetectError = true;
          }
        }
        first = false;
      }
      if (cancelled) return;

      const confirmed = confirmRead(previous, current);
      if (confirmed && video) {
        freeze(video, snapshotRef.current);
        stopCamera();
        finished = true;
        clearTimeout(slowTimer);
        setStatus("read");
        navigator.vibrate?.(30); // a short buzz on Android; iPhones ignore it
        callbacks.current.onDetected(confirmed);
        return;
      }
      loopTimer = setTimeout(() => scan(reader, canvas, current, first), SCAN_EVERY_MS);
    }

    // Hidden (locked phone, other app): stop. Visible again: start over.
    function onVisibility() {
      if (finished) return;
      if (document.visibilityState === "hidden") {
        cancelled = true;
        clearTimeout(loopTimer);
        clearTimeout(slowTimer);
        stopCamera();
      } else if (cancelled) {
        setStatus("starting");
        setSlow(false);
        setTorchOn(false);
        setAttempt((n) => n + 1);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    start();

    return () => {
      cancelled = true;
      clearTimeout(loopTimer);
      clearTimeout(slowTimer);
      stopCamera();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [attempt, videoRef, frameRef, snapshotRef]);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }

  return { status, slow, torch: { available: torchAvailable, on: torchOn, toggle: toggleTorch } };
}

// Copies only the part of the picture inside the frame (plus a margin)
// onto the canvas the reader looks at.
function drawFrameArea(video: HTMLVideoElement, frame: HTMLElement, canvas: HTMLCanvasElement) {
  const videoBox = video.getBoundingClientRect();
  const frameBox = frame.getBoundingClientRect();
  const crop = frameToVideo(
    { width: video.videoWidth, height: video.videoHeight },
    { width: videoBox.width, height: videoBox.height },
    {
      x: frameBox.left - videoBox.left,
      y: frameBox.top - videoBox.top,
      width: frameBox.width,
      height: frameBox.height,
    },
  );
  if (crop.width <= 0 || crop.height <= 0) return;
  canvas.width = crop.width;
  canvas.height = crop.height;
  canvas
    .getContext("2d", { willReadFrequently: true })
    ?.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
}

// Keeps the last picture on screen after the camera turns off.
function freeze(video: HTMLVideoElement, snapshot: HTMLCanvasElement | null) {
  if (!snapshot) return;
  snapshot.width = video.videoWidth;
  snapshot.height = video.videoHeight;
  snapshot.getContext("2d")?.drawImage(video, 0, 0);
}
