import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SHIFT Airdrop",
  description: "SHIFT Behavioral Airdrop - Earn XP by trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        <header className="border-b border-slate-800 bg-slate-900 py-4 sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">SHIFT Airdrop</h1>
                <p className="text-xs text-slate-400">Earn XP through trading</p>
              </div>
              <nav className="flex gap-4 text-sm">
                <a href="/" className="hover:text-blue-400">Home</a>
                <a href="/dashboard" className="hover:text-blue-400">Dashboard</a>
                <a href="/leaderboard" className="hover:text-blue-400">Leaderboard</a>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
