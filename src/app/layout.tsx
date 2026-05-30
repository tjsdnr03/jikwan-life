import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "직관생활 — KBO 직관 기록 & 카드",
  description:
    "야구 직관을 기록하고, 예쁜 카드로 만들어서, 인스타에 바로 공유하세요. 20~30대 KBO 팬을 위한 직관 기록 앱.",
  keywords: ["KBO", "야구", "직관", "직관기록", "직관생활", "인스타카드"],
  applicationName: "직관생활",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#B8D4F8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
