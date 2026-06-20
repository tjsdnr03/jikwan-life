import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "직관생활 — KBO 직관 기록 & 카드",
  description:
    "야구 직관을 기록하고, 예쁜 카드로 만들어서, 인스타에 바로 공유하세요. 20~30대 KBO 팬을 위한 직관 기록 앱.",
  keywords: ["KBO", "야구", "직관", "직관기록", "직관생활", "인스타카드"],
  applicationName: "직관생활",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  // iOS 홈 화면 추가 시 standalone 동작 + 상태바 스타일
  appleWebApp: {
    capable: true,
    title: "직관생활",
    statusBarStyle: "default",
  },
  // Next는 표준 'mobile-web-app-capable'을 내보내므로, 구형 iOS 호환용
  // 레거시 태그를 추가로 명시한다.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1A56DB",
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
