"use server";
// What happens after a barcode is read: is it one of YOUR foods, and if
// not, does Open Food Facts know it? Runs on the server.
//
// Why Open Food Facts is asked from the server and not your phone: they ask
// every app to say who it is in the User-Agent header, and browsers aren't
// allowed to set that header. The server can, and it can give up after a
// few seconds so you're never stuck looking at a spinner.

import { normalizeBarcode } from "./barcode";
import { OFF_USER_AGENT, offProductUrl, parseOffResponse, type OffDraft } from "./open-food-facts";
import { logDbError, requireUser } from "./server-helpers";

export type ScanLookup =
  | { kind: "mine"; foodId: string }
  | { kind: "found"; barcode: string; draft: OffDraft }
  | { kind: "not_found"; barcode: string }
  /** Open Food Facts didn't answer in time, or answered with an error. */
  | { kind: "unavailable"; barcode: string }
  | { kind: "invalid" }
  /** Something went wrong on our side (database, login). */
  | { kind: "error" };

const TIMEOUT_MS = 8000;

export async function lookupBarcode(raw: string, format?: string): Promise<ScanLookup> {
  // The browser can send anything here, so check it again on the server.
  const barcode = typeof raw === "string" ? normalizeBarcode(raw, format) : null;
  if (!barcode) return { kind: "invalid" };

  try {
    const supabase = await requireUser();

    // Your own foods first: no internet lookup needed for a food you have.
    // Row Level Security limits this to your rows.
    const { data, error } = await supabase
      .from("foods")
      .select("id")
      .eq("barcode", barcode)
      .maybeSingle();
    if (error) {
      logDbError("lookupBarcode", error);
      return { kind: "error" };
    }
    if (data) return { kind: "mine", foodId: data.id };
  } catch (error) {
    console.error("lookupBarcode failed:", error);
    return { kind: "error" };
  }

  return askOpenFoodFacts(barcode);
}

async function askOpenFoodFacts(barcode: string): Promise<ScanLookup> {
  const first = await fetchProduct(barcode);
  // We save American codes with a leading 0 (13 digits). Open Food Facts
  // usually finds them either way, but some are only filed under 12.
  if (first === "not_found" && barcode.length === 13 && barcode.startsWith("0")) {
    const second = await fetchProduct(barcode.slice(1));
    return toLookup(barcode, second);
  }
  return toLookup(barcode, first);
}

function toLookup(barcode: string, result: OffDraft | "not_found" | "unavailable"): ScanLookup {
  if (result === "not_found") return { kind: "not_found", barcode };
  if (result === "unavailable") return { kind: "unavailable", barcode };
  return { kind: "found", barcode, draft: result };
}

async function fetchProduct(code: string): Promise<OffDraft | "not_found" | "unavailable"> {
  try {
    const response = await fetch(offProductUrl(code), {
      headers: { "User-Agent": OFF_USER_AGENT, Accept: "application/json" },
      // Stop waiting after 8 seconds; the scanner then offers "Try again".
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    // They answer 404 for a barcode they don't have.
    if (response.status === 404) return "not_found";
    if (!response.ok) {
      console.error("Open Food Facts answered", response.status, "for", code);
      return "unavailable";
    }
    const draft = parseOffResponse(await response.json());
    return draft ?? "not_found";
  } catch (error) {
    // A timeout, no connection from the server, or a reply that wasn't JSON.
    console.error("Open Food Facts lookup failed for", code, error);
    return "unavailable";
  }
}
