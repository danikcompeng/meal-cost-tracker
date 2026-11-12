// Gets a barcode reader for this browser. Browser-only: call it from a
// client component, after the page has loaded.
//
// Chrome on Android has one built in (BarcodeDetector). Safari on iPhone
// and Chrome on Windows don't, so for them we load the `barcode-detector`
// package: the same API, backed by ZXing (a barcode library) compiled to
// WebAssembly. Our code doesn't need to know which one it got.

import { GROCERY_FORMATS } from "./barcode";

export type DetectedCode = { rawValue: string; format: string };
export type Reader = { detect(source: HTMLCanvasElement): Promise<DetectedCode[]> };

// The WebAssembly file is copied into /public with its version in the name
// (lib/barcode-reader.test.ts checks it's there and matches the package).
// Served from our own site instead of the package's default CDN, so
// scanning never depends on someone else's server.
export const wasmPath = (version: string) => `/zxing/zxing_reader-${version}.wasm`;

type DetectorClass = {
  new (options: { formats: string[] }): Reader;
  getSupportedFormats(): Promise<readonly string[]>;
};

export async function createReader(): Promise<Reader> {
  const native = (globalThis as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  if (native) {
    try {
      const supported = await native.getSupportedFormats();
      if (GROCERY_FORMATS.every((f) => supported.includes(f))) {
        return new native({ formats: [...GROCERY_FORMATS] });
      }
    } catch {
      // Some browsers have the class but it fails: use ZXing instead.
    }
  }

  // Loaded only now, so the ~1 MB reader is never downloaded by people
  // who don't scan, or whose phone has one built in.
  const { BarcodeDetector, prepareZXingModule, ZXING_WASM_VERSION } = await import(
    "barcode-detector/ponyfill"
  );
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? wasmPath(ZXING_WASM_VERSION) : prefix + path,
    },
  });
  return new BarcodeDetector({ formats: [...GROCERY_FORMATS] });
}
