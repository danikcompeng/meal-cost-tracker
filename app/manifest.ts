// Served at /manifest.webmanifest. Next.js adds the <link rel="manifest">
// tag to every page by itself. The contents live in lib/app-identity.ts,
// next to the name and icons, so they can be tested.
import type { MetadataRoute } from "next";
import { appManifest } from "@/lib/app-identity";

export default function manifest(): MetadataRoute.Manifest {
  return appManifest();
}
