# Barcode scanning (approved 2026-11-11)

## Decisions
1. Open Food Facts is called from our server with the User-Agent
   "MealCostTracker/0.1 (https://meal-cost-tracker.vercel.app)". No
   personal email.
2. Scanning a food you already have goes straight to "Log it" for today.
   "Bought another?" (record a new purchase from a scan) is deferred to
   the Kitchen feature; it's on the reviewer's deferred list.
3. Energy given only in kJ is converted (kJ / 4.184) and the form says
   "Converted from kJ" under Calories.
4. "Type the number" (enter the barcode digits by hand) is on both the
   scan screen and the camera-blocked screen.

## Browser support
- Chrome on Android: built-in BarcodeDetector.
- Safari on iPhone: no BarcodeDetector (only behind a feature flag,
  reported broken since iOS 18).
- So we use the `barcode-detector` package: the same API everywhere,
  using the built-in reader where it exists and ZXing (WebAssembly)
  otherwise. The .wasm file is served from /public, not a CDN, and only
  loads when the scanner opens.
- Formats: EAN-13, EAN-8, UPC-A, UPC-E only.
- The camera needs HTTPS (Vercel or localhost). Test on a phone with a
  Vercel preview.

## Flow
Tap Scan -> /scan -> camera starts
- permission denied -> "Camera is blocked" screen
- barcode read (same code twice in a row, valid check digit)
  -> look it up in MY foods
     - found -> /?log=<foodId>: Today with the "Log it" sheet open, meal
       picked by time of day
     - not mine -> Open Food Facts (server, 8 s timeout)
       - found -> food form filled in -> "Save and log" -> Log it sheet
       - missing macros -> same form, note names what's missing, blanks
         stay blank (never 0)
       - not found -> food form with only the barcode attached
       - offline / not answering -> retry screen (keeps the barcode)
The camera stops once a code is read, when the page is hidden, and
when you leave /scan.

## Layout
- Tab bar: Today · Scan · Foods. Scan is a round 56px matcha button,
  slightly raised, white icon, small "Scan" label.
- Camera screen: always dark (#141414). Close (X) top left, torch top
  right only when supported. Live picture, dimmed outside a wide rounded
  frame with white corners. Hint under the frame; after 8 s "Hold it a
  little further away if it's blurry". Bottom: "Type the number" and
  "Enter manually".
- States: loading the camera ("Starting camera…"), scanning (corners
  breathing softly), read (frozen picture, matcha corners, short buzz
  on Android), looking up (bottom panel with skeleton lines and the
  barcode), found (white sheet "Check the numbers", "From Open Food
  Facts · compare with the label", blanks say "not listed"), not found
  ("Not on Open Food Facts yet", Add it / Scan again), offline ("You're
  offline", Try again / Enter manually), not answering ("Open Food
  Facts isn't answering"), camera blocked (white page, steps for the
  detected phone only, "Other phone?" disclosure, Try again / Type the
  number / Enter manually), no camera / camera busy / not HTTPS.

## Motion
Scanner fades in (150 ms). Corners breathe slowly (~2 s). On a read
the corners snap in matcha (~150 ms spring). Panel grows into the
sheet; skeleton cross-fades to the real name. Reduced motion: no
breathing or snap, color change only; sheets fade.

## Data
Migration 007 on foods:
- barcode text, digits only, 8-14 long, optional
- unique (user_id, barcode)
- brand text, optional
- source 'manual' | 'open_food_facts' | 'label_photo', default 'manual'
RLS unchanged (covers whole rows).
lib/barcode.ts checks the check digit and turns UPC-A / UPC-E into
the 13-digit form. A duplicate save shows "You already have this food"
with a link to log it.

## Files
New: migration 007, lib/barcode.ts (+test), lib/open-food-facts.ts
(+test with sample replies), lib/scan-actions.ts, app/scan/page.tsx,
components: scanner, scan-frame, scan-result, camera-blocked,
scan-button, barcode-entry.
Changed: food-form, food-actions, food-validation, foods, types,
tab-bar, today-view (?log=), food-row (brand).
Tests: unit tests only. Hand test on iPhone and Android with a Vercel
preview before merging to main.
