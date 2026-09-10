import type { Metadata, Viewport } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const tech = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-tech",
});

export const metadata: Metadata = {
  title: "个人财务分析",
  description: "看清家底，留存每一次财务分析",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05060c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${orbitron.variable} ${tech.variable} min-h-dvh bg-void font-sans text-ink antialiased`}>
        <div className="relative z-10 mx-auto min-h-dvh w-full max-w-page px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
