import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Money Fire Drill",
  description:
    "A safe, timed practice app that teaches UPI safety, fraud response and phishing indicators. Education, not personal advice. No real payments.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf9f6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="font-sans text-st-on-surface bg-st-surface antialiased">{children}</body>
    </html>
  );
}
