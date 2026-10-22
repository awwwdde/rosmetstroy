import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";

import { SITE_URL } from "@/lib/seo";

import "./globals.css";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-onest",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Росметстрой — металлоконструкции и комплексные решения", template: "%s — Росметстрой" },
  applicationName: "Росметстрой",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#071D36",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={onest.variable}>
      <body>{children}</body>
    </html>
  );
}
