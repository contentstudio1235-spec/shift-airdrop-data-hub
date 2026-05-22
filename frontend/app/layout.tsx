import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { WalletProvider } from '@/components/WalletContext';
import { ToastProvider } from '@/components/ToastContext';
import { PostHogProvider } from '@/components/PostHogProvider';
import NavBar from '@/components/NavBar';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter-var',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SHIFT Airdrop — Earn XP Through Trading',
  description: 'Trade RWA tokens on Jupiter and earn XP. Hold longer for multiplier bonuses. Compete for the SHIFT airdrop.',
  openGraph: {
    title: 'SHIFT Airdrop',
    description: 'Earn XP by trading real-world asset tokens on Solana',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <PostHogProvider>
          <WalletProvider>
            <ToastProvider>
              <NavBar />
              <main>{children}</main>
              <Analytics />
            </ToastProvider>
          </WalletProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
