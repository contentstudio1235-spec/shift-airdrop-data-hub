import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import './globals.css';
import { WalletProvider } from '@/components/WalletContext';
import { ToastProvider } from '@/components/ToastContext';
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
  icons: {
    icon: '/shift_favicon.png',
    apple: '/shift_favicon.png',
  },
  openGraph: {
    title: 'SHIFT Airdrop',
    description: 'Earn XP by trading real-world asset tokens on Solana',
    images: ['/og.png'],
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        <WalletProvider>
          <ToastProvider>
            <NavBar />
            <main>{children}</main>
            <Analytics />
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
