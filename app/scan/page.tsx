import type { Metadata } from "next";
import { ScanFlow } from "@/components/scan-flow";

export const metadata: Metadata = { title: "Scan · Meal Cost Tracker" };

// Full screen, no tab bar: the camera takes over until you close it.
// Everything happens in the browser (camera, reading), so this page has no
// server data of its own. Logged-out visitors are sent to /login by
// proxy.ts before they get here.
export default function ScanPage() {
  return <ScanFlow />;
}
