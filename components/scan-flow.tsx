"use client";

// The whole scan, from camera to saved food. Holds one piece of state:
// which step you're on.
//
//   camera ──read──> scanned (looking up…) ──┬─ yours ──────> Today, "Log it"
//     │                                      ├─ found ──────> form (filled in)
//     │                                      └─ not found / offline / error
//     ├─ "Type the number" ──> typing (same lookup)
//     ├─ "Enter manually" ───> form (empty)
//     └─ camera problem ─────> blocked
//
// Saving the form goes to Today with the "Log it" sheet open.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type { CameraProblem } from "@/lib/camera";
import { draftFromOpenFoodFacts, emptyDraft, type FoodDraft } from "@/lib/food-draft";
import { lookupBarcode } from "@/lib/scan-actions";
import { BarcodeEntry } from "./barcode-entry";
import { CameraBlocked } from "./camera-blocked";
import { FoodForm } from "./food-form";
import { LookupStatus, ScanPanel, type Lookup, type LookupState } from "./scan-result";
import { Scanner } from "./scanner";

type Step =
  | { kind: "camera" }
  | { kind: "scanned"; lookup: Lookup }
  | { kind: "blocked"; problem: CameraProblem }
  | { kind: "typing"; lookup: Lookup | null }
  | { kind: "form"; draft: FoodDraft; title: string; subtitle: string };

export function ScanFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "camera" });
  // A new key gives a fresh Scanner, which starts the camera again.
  const [scannerKey, setScannerKey] = useState(0);
  // Remembered so "Back" from typing returns to the blocked screen, not a
  // camera that can't start.
  const [cameraProblem, setCameraProblem] = useState<CameraProblem | null>(null);
  // Each lookup gets a number. If you tap "Scan again" while one is still
  // running, its late answer is ignored instead of replacing the new step.
  const requestId = useRef(0);

  // Leaving the scan page cancels any lookup still running. Without this,
  // a late "that's yours" answer would still pull you to Today: the router
  // keeps working after this component is gone.
  useEffect(() => {
    const ids = requestId;
    return () => {
      ids.current++;
    };
  }, []);

  function close() {
    requestId.current++;
    // Back to wherever you opened the scanner from, or Today if the
    // scanner was the first page opened.
    if (window.history.length > 1) router.back();
    else router.replace("/");
  }

  function startCamera() {
    requestId.current++;
    setCameraProblem(null);
    setScannerKey((k) => k + 1);
    setStep({ kind: "camera" });
  }

  function backFromTyping() {
    requestId.current++;
    if (cameraProblem) setStep({ kind: "blocked", problem: cameraProblem });
    else startCamera();
  }

  function openForm(draft: FoodDraft) {
    requestId.current++;
    if (draft.source === "open_food_facts") {
      setStep({ kind: "form", draft, title: "Check the numbers", subtitle: "From Open Food Facts · compare with the label" });
    } else if (draft.barcode) {
      setStep({
        kind: "form",
        draft,
        title: "Add this food",
        subtitle: `Barcode ${draft.barcode} · it'll be recognised next time you scan`,
      });
    } else {
      setStep({ kind: "form", draft, title: "Add a food", subtitle: "Type it in from the label" });
    }
  }

  async function lookUp(barcode: string, from: "camera" | "typing") {
    const id = ++requestId.current;
    const show = (state: LookupState) => {
      if (id !== requestId.current) return;
      const lookup = { barcode, state };
      setStep(from === "camera" ? { kind: "scanned", lookup } : { kind: "typing", lookup });
    };

    show("looking");
    // The phone already knows it has no connection: don't even try.
    if (navigator.onLine === false) return show("offline");

    let result;
    try {
      result = await lookupBarcode(barcode);
    } catch (error) {
      // The request to our server didn't get through: almost always a
      // lost connection (the server's own problems come back as "error").
      // Logged, because right after a new deploy an old open page can also
      // fail here ("Failed to find Server Action"), and that isn't offline.
      console.error("Barcode lookup request failed:", error);
      return show("offline");
    }
    if (id !== requestId.current) return;

    switch (result.kind) {
      case "mine":
        // "Looking up…" stays on screen while Today loads.
        router.replace(`/?log=${result.foodId}`);
        return;
      case "found":
        return openForm(draftFromOpenFoodFacts(result.barcode, result.draft));
      case "not_found":
        return show("not_found");
      case "unavailable":
        return show("unavailable");
      case "invalid":
      case "error":
        return show("error");
    }
  }

  // "Add it" and "Enter manually" after a lookup: the form, keeping the
  // barcode so the food is recognised next time.
  const addWithBarcode = (barcode: string) => openForm(emptyDraft(barcode));

  return (
    // reducedMotion="user": if your phone asks for less motion, slides
    // become fades.
    <MotionConfig reducedMotion="user">
      {(step.kind === "camera" || step.kind === "scanned") && (
        <Scanner
          key={scannerKey}
          onDetected={(barcode) => lookUp(barcode, "camera")}
          onProblem={(problem) => {
            setCameraProblem(problem);
            setStep({ kind: "blocked", problem });
          }}
          onClose={close}
          onTypeNumber={() => setStep({ kind: "typing", lookup: null })}
          onManual={() => openForm(emptyDraft(null))}
        >
          {step.kind === "scanned" && (
            <ScanPanel>
              <LookupStatus
                lookup={step.lookup}
                onAddIt={addWithBarcode}
                onScanAgain={startCamera}
                onRetry={(barcode) => lookUp(barcode, "camera")}
                onManual={addWithBarcode}
              />
            </ScanPanel>
          )}
        </Scanner>
      )}

      {step.kind === "blocked" && (
        <CameraBlocked
          problem={step.problem}
          onRetry={startCamera}
          onTypeNumber={() => setStep({ kind: "typing", lookup: null })}
          onManual={() => openForm(emptyDraft(null))}
          onClose={close}
        />
      )}

      {step.kind === "typing" && (
        <BarcodeEntry
          initial={step.lookup?.barcode}
          backLabel={cameraProblem ? "Back" : "Scan instead"}
          onBack={backFromTyping}
          onSubmit={(barcode) => lookUp(barcode, "typing")}
        >
          {step.lookup && (
            <LookupStatus
              lookup={step.lookup}
              onAddIt={addWithBarcode}
              onScanAgain={() => setStep({ kind: "typing", lookup: null })}
              scanAgainLabel="Type another"
              onRetry={(barcode) => lookUp(barcode, "typing")}
              onManual={addWithBarcode}
            />
          )}
        </BarcodeEntry>
      )}

      {step.kind === "form" && (
        <motion.main
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className="mx-auto w-full max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10"
        >
          <button
            type="button"
            onClick={cameraProblem ? () => setStep({ kind: "blocked", problem: cameraProblem }) : startCamera}
            className="-ml-2 flex h-11 items-center gap-1 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            {cameraProblem ? "Back" : "Scan again"}
          </button>
          <h1 className="mt-4 text-[30px] leading-tight font-bold">{step.title}</h1>
          <p className="mt-1 mb-6 text-[13px] font-medium text-muted-foreground tabular-nums">
            {step.subtitle}
          </p>
          <FoodForm
            editing={null}
            draft={step.draft}
            submitLabel="Save and log"
            onDone={(id) => {
              if (id) router.replace(`/?log=${id}`);
            }}
          />
        </motion.main>
      )}
    </MotionConfig>
  );
}
