import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ToastContainer from "@/components/ToastContainer";
import BetModal from "@/components/BetModal";
import { LayoutShell } from "@/components/LayoutShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AGDPBet — Predict the AI Agent Leaderboard",
  description:
    "Decentralized prediction market for the Virtuals Protocol aGDP leaderboard. Back outcomes on which AI agents will dominate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0F19] text-gray-100 min-h-screen`}
      >
        <Providers>
          <LayoutShell>
            {children}
          </LayoutShell>
          <BetModal />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
