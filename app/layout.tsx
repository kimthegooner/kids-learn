import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리의 배움 숲 · 한글·영어·수학",
  description: "303개 낱말과 악기 도감, 7가지 악기로 듣는 동요, 한글·영어와 덧셈·뺄셈·곱셈을 즐겁게 배우는 공간",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fff7ed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
