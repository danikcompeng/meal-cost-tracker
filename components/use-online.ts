"use client";

// Is the phone online? true / false, and redraws when it changes.
//
// How it knows: the browser keeps navigator.onLine up to date and fires
// "online" / "offline" events when it changes. useSyncExternalStore is
// React's way of reading a value that lives outside React, and redrawing
// when it changes. On the server there's no navigator, so it says online,
// and the browser corrects that straight away.
//
// "Online" only means the phone has a network: Wi-Fi with no internet
// still counts. So it can say false for sure, but true is only a hope.

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
