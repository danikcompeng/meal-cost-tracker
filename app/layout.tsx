import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { OfflineStrip } from "@/components/offline-strip";
import { TimezoneSync } from "@/components/timezone-sync";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  PAGE_BACKGROUND,
  iconByFile,
  iconUrl,
} from "@/lib/app-identity";
import "./globals.css";

// The one font for the whole app: bold for page titles and the big number,
// regular for everything else. Has tabular numbers, so prices line up.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// The "!" tells TypeScript "this can't be missing". It's safe here because
// lib/app-identity.test.ts checks both files are in the icon list.
const tabIcon = iconByFile("icon-192.png")!;
const iPhoneIcon = iconByFile("apple-touch-icon.png")!;

export const metadata: Metadata = {
  // A page's own title gets the app name after it ("Today · Staple"), so
  // pages only say what they are. Without one, it's just the name.
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  icons: {
    icon: { url: iconUrl(tabIcon), type: "image/png", sizes: "192x192" },
    apple: { url: iconUrl(iPhoneIcon), sizes: "180x180" },
  },
  // What iPhone uses when you tap Share, then Add to Home Screen.
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    // A solid status bar: the page starts below the clock and battery, so
    // nothing can ever sit under the notch or the Dynamic Island.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // "cover" lets the page reach the very edges of the screen and switches
  // on env(safe-area-inset-...): how tall the iPhone's home bar is, etc.
  // Without it those are always 0. The tab bar, bottom sheets, Undo
  // message and scanner already add them, so they stay clear of the home
  // bar; screens with a tab bar get the extra room from pb-above-tab-bar.
  viewportFit: "cover",
  // The status bar's colour, matching the page in light and dark mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PAGE_BACKGROUND.light },
    { media: "(prefers-color-scheme: dark)", color: PAGE_BACKGROUND.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TimezoneSync />
        {/* Reduce Motion for every screen (components/motion-provider.tsx). */}
        <MotionProvider>
          <OfflineStrip />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
