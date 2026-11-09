import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { TimezoneSync } from "@/components/timezone-sync";
import "./globals.css";

// Body/UI font. Has tabular numbers, so prices in lists line up.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// Display font: page titles and the one big number per screen.
// "SOFT" rounds the serifs (switched on in globals.css).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Meal Cost Tracker",
  description: "Cheap meals on repeat, without getting bored.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TimezoneSync />
        {children}
      </body>
    </html>
  );
}
