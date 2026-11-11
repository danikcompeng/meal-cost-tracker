import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { TabBar } from "@/components/tab-bar";
import { TargetsForm } from "@/components/targets-form";
import { getTargets } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings · Meal Cost Tracker" };

export default function SettingsPage() {
  return (
    <>
      {/* Bottom padding leaves room for the tab bar fixed at the bottom. */}
      <main className="mx-auto w-full max-w-lg px-4 pt-8 pb-28">
        <AppHeader title="Settings" showSettingsLink={false} />
        <Suspense
          fallback={
            <div
              aria-busy="true"
              aria-label="Loading your targets"
              className="h-80 rounded-2xl bg-card motion-safe:animate-pulse"
            />
          }
        >
          <TargetsTile />
        </Suspense>
      </main>
      {/* Settings isn't a tab, so no tab is highlighted here. */}
      <TabBar />
    </>
  );
}

async function TargetsTile() {
  // Live data: only load it on a real visit, never ahead of time.
  await connection();
  const targets = await getTargets();
  return <TargetsForm targets={targets} />;
}
