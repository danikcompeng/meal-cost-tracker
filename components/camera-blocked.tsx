"use client";

// Shown when the camera can't start. For "blocked" (permission denied) it
// explains how to allow the camera, with only the steps for YOUR phone, and
// the others under "Other phone?". There's always a way forward without the
// camera: type the number, or enter the food by hand.

import { useSyncExternalStore } from "react";
import { CameraOff, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { platformFrom, type CameraProblem, type Platform } from "@/lib/camera";

const STEPS: Record<Exclude<Platform, "other">, { name: string; steps: string[] }> = {
  ios: {
    name: "iPhone (Safari)",
    steps: [
      "Tap the page menu at the left of the address bar (aA).",
      "Tap Website Settings.",
      "Set Camera to Allow, then tap Try again.",
    ],
  },
  ios_home_screen: {
    name: "iPhone (home-screen app)",
    steps: [
      "Open the Settings app.",
      "Go to Apps, then Safari, then Camera.",
      "Choose Allow (or Ask), come back here and tap Try again.",
    ],
  },
  android: {
    name: "Android (Chrome)",
    steps: [
      "Tap the icon at the left of the web address.",
      "Tap Permissions (or Site settings), then Camera.",
      "Choose Allow, then tap Try again.",
    ],
  },
  // The installed app has no address bar, but it shares the settings of the
  // browser it was added from (usually Chrome). {site} becomes this app's
  // address, which you never see in the installed app.
  android_home_screen: {
    name: "Android (home-screen app)",
    steps: [
      "Open Chrome (or the browser you added this app from), tap the ⋮ menu, then Settings.",
      "Scroll down to Site settings, then tap Camera. If the switch at the top is off, turn it on.",
      "Under Blocked, tap {site}, then set Camera to Allow.",
      "Come back here and tap Try again.",
    ],
  },
};

/** Puts this app's address into a step ("Under Blocked, tap {site}..."). */
function withSite(step: string, site: string | null) {
  return step.replace("{site}", site ?? "this app's web address");
}

// This app's address (e.g. stapleapp.vercel.app). Like the
// platform, only the browser knows it, so the server paint gets null.
function useSite(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => location.host,
    () => null,
  );
}

const OTHER_STEPS = {
  name: "Other browsers",
  steps: ["Open this site's settings in your browser (often an icon by the address).", "Allow the camera, then tap Try again."],
};

const PROBLEMS: Record<Exclude<CameraProblem, "denied">, { title: string; body: string }> = {
  no_camera: { title: "No camera found", body: "This device doesn't seem to have a camera we can use." },
  busy: {
    title: "The camera is busy",
    body: "Another app may be using it. Close that app, then try again.",
  },
  insecure: {
    title: "The camera needs a secure connection",
    body: "Browsers only allow the camera on https:// addresses. Open the app from its https:// link.",
  },
  unsupported: {
    title: "This browser can't use the camera",
    body: "Try Safari on iPhone or Chrome on Android.",
  },
  reader: {
    title: "Couldn't start the barcode reader",
    body: "It downloads the first time you scan. Check your connection and try again.",
  },
};

// Which phone you're on. Read in the browser only (the server can't know),
// so the first paint on the server shows the generic steps.
function usePlatform(): Platform {
  return useSyncExternalStore(
    () => () => {},
    () =>
      platformFrom(
        navigator.userAgent,
        navigator.maxTouchPoints,
        window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as { standalone?: boolean }).standalone === true,
      ),
    () => "other",
  );
}

export function CameraBlocked({
  problem,
  onRetry,
  onTypeNumber,
  onManual,
  onClose,
}: {
  problem: CameraProblem;
  onRetry: () => void;
  onTypeNumber: () => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const platform = usePlatform();
  const site = useSite();
  const mine = platform === "other" ? OTHER_STEPS : STEPS[platform];
  const others = [
    ...Object.entries(STEPS)
      .filter(([key]) => key !== platform)
      .map(([, value]) => value),
    ...(platform === "other" ? [] : [OTHER_STEPS]),
  ];
  const title = problem === "denied" ? "Camera is blocked" : PROBLEMS[problem].title;

  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="focus-ring -mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
      </div>

      <div className="mt-4 flex size-14 items-center justify-center rounded-2xl bg-card">
        <CameraOff aria-hidden="true" className="size-7 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-3xl leading-tight font-bold">{title}</h1>

      {problem === "denied" ? (
        <>
          <p className="mt-2 text-muted-foreground">
            The browser isn&apos;t allowed to use the camera. You can change that:
          </p>
          <section className="mt-6 rounded-2xl bg-card p-4">
            <h2 className="text-label font-medium text-muted-foreground">{mine.name}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {mine.steps.map((step) => (
                <li key={step}>{withSite(step, site)}</li>
              ))}
            </ol>
          </section>
          <details className="group mt-3 rounded-2xl px-4 py-2">
            {/* "flex" hides the browser's own ▸ marker (older iPhones need
                the webkit line too), so a chevron shows open or shut
                instead (group-open: while <details> is open). */}
            <summary className="focus-ring flex h-11 cursor-pointer items-center gap-1 rounded-md text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
              Other phone or app?
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="space-y-4 pb-2">
              {others.map((other) => (
                <div key={other.name}>
                  <h3 className="text-label font-medium text-muted-foreground">{other.name}</h3>
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                    {other.steps.map((step) => (
                      <li key={step}>{withSite(step, site)}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </details>
        </>
      ) : (
        <p className="mt-2 text-muted-foreground">{PROBLEMS[problem].body}</p>
      )}

      <div className="mt-8 space-y-2">
        {problem !== "no_camera" && problem !== "unsupported" && problem !== "insecure" && (
          <Button onClick={onRetry} className="press-wide h-11 w-full text-base">
            Try again
          </Button>
        )}
        <Button variant="outline" onClick={onTypeNumber} className="press-wide h-11 w-full text-base">
          Type the number
        </Button>
        <Button variant="ghost" onClick={onManual} className="press-wide h-11 w-full text-base">
          Enter manually
        </Button>
      </div>
    </main>
  );
}
