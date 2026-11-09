"use client"; // Error pages must run in the browser so "Try again" works.

// Shown instead of a screen when loading its data fails (for example, the
// database is unreachable). The real reason is in the browser console and
// in the server logs.

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16 text-center">
      <h1 className="text-[30px] leading-tight font-semibold">Couldn’t load this</h1>
      <p className="mt-3 text-muted-foreground">
        Check your connection, then try again. Nothing you logged is lost.
      </p>
      <Button onClick={() => retry()} className="mt-6 h-11 px-6 text-base">
        Try again
      </Button>
    </main>
  );
}
