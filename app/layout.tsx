import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "agri2026 매입 시뮬레이터 — 살까, 기다릴까",
  description:
    "발주 전에 미리 돌려보는 3-시나리오 농산물 매입 의사결정 도구. 27년 실측 이벤트 계수 + 라이브 예측. AgriY&D.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *{box-sizing:border-box}
          body{margin:0;background:#fff;-webkit-font-smoothing:antialiased}
          a{color:#0066cc;text-decoration:none}
          a:hover{text-decoration:underline}
          input{font-family:inherit}
          @keyframes spin{to{transform:rotate(360deg)}}
          input[type=date]::-webkit-calendar-picker-indicator{opacity:.5}
          button:focus-visible{outline:2px solid #0071e3;outline-offset:2px}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
