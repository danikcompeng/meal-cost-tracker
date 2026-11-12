import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ZXING_WASM_SHA256, ZXING_WASM_VERSION } from "zxing-wasm/reader";
import { wasmPath } from "./barcode-reader";

// If someone updates the barcode-detector package, the reader looks for a
// new file name. This fails until the matching .wasm is copied into
// /public, instead of the scanner silently breaking on iPhones:
//   cp node_modules/zxing-wasm/dist/reader/zxing_reader.wasm \
//      public/zxing/zxing_reader-<version>.wasm
describe("self-hosted barcode reader", () => {
  const file = join(process.cwd(), "public", wasmPath(ZXING_WASM_VERSION));

  it("has the .wasm file for the installed version in /public", () => {
    expect(existsSync(file), `missing ${file}`).toBe(true);
  });

  it("is exactly the file the package expects", () => {
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
    expect(hash).toBe(ZXING_WASM_SHA256);
  });
});
