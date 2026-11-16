// Serves the app's icon PNGs: /icons/icon-192.png, /icons/icon-512.png,
// /icons/icon-maskable-512.png and /icons/apple-touch-icon.png (the list
// is APP_ICONS in lib/app-identity.ts). Any other name is a 404.
//
// generateStaticParams makes each one once, when the app is built, so
// phones get a ready-made file instead of a drawing made on every request.
//
// No login needed: proxy.ts skips everything under /icons/, because the
// phone fetches icons without your login cookie.
import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/app-icon";
import { APP_ICONS, iconByFile } from "@/lib/app-identity";

export function generateStaticParams() {
  return APP_ICONS.map((icon) => ({ file: icon.file }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[file]">) {
  const icon = iconByFile((await params).file);
  if (!icon) return new Response("Not found", { status: 404 });
  return new ImageResponse(<AppIcon size={icon.size} shape={icon.shape} />, {
    width: icon.size,
    height: icon.size,
  });
}
