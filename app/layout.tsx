import type { Metadata, Viewport } from "next";
import { Bangers, Geist_Mono, Rubik } from "next/font/google";
import "./globals.css";

const pop = Bangers({ variable: "--font-pop", weight: "400", subsets: ["latin"] });
const body = Rubik({ variable: "--font-body", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cube Solver",
  description: "Photograph your Rubik's cube and solve it step by step.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffe14d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${pop.variable} ${body.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
