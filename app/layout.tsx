import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { TimezoneSync } from "@/components/timezone-sync";
import "./globals.css";

// The one font for the whole app: bold for page titles and the big number,
// regular for everything else. Has tabular numbers, so prices line up.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meal Cost Tracker",
  description: "Cheap meals on repeat, without getting bored.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TimezoneSync />
        {children}
      </body>
    </html>
  );
}
