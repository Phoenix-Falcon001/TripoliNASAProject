import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SampleBanner from "@/components/SampleBanner";
import { getCardData } from "@/lib/cards";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flame in Freefall",
  description: "Verified evidence cards from NASA fire-in-space research, ranked for crew safety.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { isSample } = getCardData();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2">
          Skip to content
        </a>
        <header>
          <Nav />
          {isSample && <SampleBanner />}
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-neutral-200 py-4 text-center text-sm text-neutral-600">
          Evidence from NASA papers · Our reading labelled · AI labelled
        </footer>
      </body>
    </html>
  );
}
