// ============================================================
// SHIFT Airdrop — Token Definitions & Chart Data
// ============================================================

import type { TokenDefinition } from './types';

export const TOKENS: TokenDefinition[] = [
  // ── Tesla series ────────────────────────────────────────────────────────────
  {
    sym: 'TSL2L',
    name: 'Shift Tesla 2x Long',
    price: 13.90,
    change: 0.31,
    changePct: 2.28,
    direction: 'up',
    mint: '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    baseMultiplier: 1.2,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily TSLA Bull 2X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/TSL2L.png',
    alpacaSymbol: 'TSLL',
    underlyingEtf: 'Direxion Daily TSLA Bull 2X ETF',
    isin: 'US25460G2865',
    solscanUrl: 'https://solscan.io/token/6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    explorerUrl: 'https://explorer.solana.com/address/6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
  },
  {
    sym: 'TSL1S',
    name: 'Shift Tesla 1x Short',
    price: 53.00,
    change: -0.66,
    changePct: -1.23,
    direction: 'down',
    mint: 'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
    baseMultiplier: 1.1,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily TSLA Bear 1X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/TSL1S.png',
    alpacaSymbol: 'TSLS',
    underlyingEtf: 'Direxion Daily TSLA Bear 1X ETF',
    isin: 'US25460G2600',
    solscanUrl: 'https://solscan.io/token/bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
    explorerUrl: 'https://explorer.solana.com/address/bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
  },
  // ── Semiconductor series ─────────────────────────────────────────────────────
  {
    sym: 'SOX3L',
    name: 'Shift Semiconductor 3x Long',
    price: 271.57,
    change: 36.89,
    changePct: 15.72,
    direction: 'up',
    mint: 'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
    baseMultiplier: 1.25,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily Semiconductor Bull 3X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/SOX3L.png',
    alpacaSymbol: 'SOXL',
    underlyingEtf: 'Direxion Daily Semiconductor Bull 3X ETF',
    isin: 'US25459W4583',
    solscanUrl: 'https://solscan.io/token/Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
    explorerUrl: 'https://explorer.solana.com/address/Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
  },
  {
    sym: 'SOX3S',
    name: 'Shift Semiconductor 3x Short',
    price: 3.98,
    change: -0.74,
    changePct: -15.68,
    direction: 'down',
    mint: '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
    baseMultiplier: 1.25,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily Semiconductor Bear 3X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/SOX3S.png',
    alpacaSymbol: 'SOXS',
    underlyingEtf: 'Direxion Daily Semiconductor Bear 3X ETF',
    isin: 'US25461H5726',
    solscanUrl: 'https://solscan.io/token/7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
    explorerUrl: 'https://explorer.solana.com/address/7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
  },
  // ── S&P 500 series ───────────────────────────────────────────────────────────
  {
    sym: 'SPX3L',
    name: 'Shift S&P500 3x Long',
    price: 281.75,
    change: 15.48,
    changePct: 5.81,
    direction: 'up',
    mint: '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
    baseMultiplier: 1.25,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily S&P 500 Bull 3X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/SPX3L.png',
    alpacaSymbol: 'SPXL',
    underlyingEtf: 'Direxion Daily S&P 500 Bull 3X ETF',
    isin: 'US25459W8626',
    solscanUrl: 'https://solscan.io/token/12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
    explorerUrl: 'https://explorer.solana.com/address/12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
  },
  {
    sym: 'SPX3S',
    name: 'Shift S&P500 3x Short',
    price: 25.85,
    change: -1.58,
    changePct: -5.78,
    direction: 'down',
    mint: '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
    baseMultiplier: 1.25,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily S&P 500 Bear 3X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/SPX3S.png',
    alpacaSymbol: 'SPXS',
    underlyingEtf: 'Direxion Daily S&P 500 Bear 3X ETF',
    isin: 'US25460E1901',
    solscanUrl: 'https://solscan.io/token/67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
    explorerUrl: 'https://explorer.solana.com/address/67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
  },
  // ── SpaceX series (launch 2026-06) ──────────────────────────────────────────
  {
    sym: 'SPCX2L',
    name: 'Shift SpaceX 2x Long',
    price: 32.30,
    change: 4.02,
    changePct: 14.21,
    direction: 'up',
    mint: 'BcVDiSc5DTp8imZE4Nx2abUhhgA3KCxJ4M5g7aHLSHFT',
    baseMultiplier: 1.35,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily SpaceX Bull 2X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/SPCX2L.png',
    alpacaSymbol: 'LOFF',
    underlyingEtf: 'Direxion Daily SpaceX Bull 2X ETF',
    isin: 'TBD',
    solscanUrl: 'https://solscan.io/token/BcVDiSc5DTp8imZE4Nx2abUhhgA3KCxJ4M5g7aHLSHFT',
    explorerUrl: 'https://explorer.solana.com/address/BcVDiSc5DTp8imZE4Nx2abUhhgA3KCxJ4M5g7aHLSHFT',
  },
  {
    sym: 'SPCX2S',
    name: 'Shift SpaceX 2x Short',
    price: 28.50,
    change: -3.50,
    changePct: -10.94,
    direction: 'down',
    mint: 'FtBpBcLU4Epjm2nnuQNRYGkFM6jfsXrcGKJSiKCtSHFT',
    baseMultiplier: 1.35,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily SpaceX Bear 2X ETF',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/SPCX2S.png',
    alpacaSymbol: 'TBD',
    underlyingEtf: 'Direxion Daily SpaceX Bear 2X ETF',
    isin: 'TBD',
    solscanUrl: 'https://solscan.io/token/FtBpBcLU4Epjm2nnuQNRYGkFM6jfsXrcGKJSiKCtSHFT',
    explorerUrl: 'https://explorer.solana.com/address/FtBpBcLU4Epjm2nnuQNRYGkFM6jfsXrcGKJSiKCtSHFT',
  },
  {
    sym: 'SPCX1L',
    name: 'Shift SpaceX',
    price: 184.14,
    change: 23.19,
    changePct: 14.41,
    direction: 'up',
    mint: 'HMtfKJDqiAbY6damtfGisodK4sotG4Vc3wiLmTXmSHFT',
    baseMultiplier: 1.30,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of SpaceX stock',
    imageUrl: 'https://tokens-data.shiftrwa.xyz/tokens/SPCX1L.png',
    alpacaSymbol: 'SPCX',
    underlyingEtf: 'SpaceX',
    isin: 'US84615Q1031',
    solscanUrl: 'https://solscan.io/token/HMtfKJDqiAbY6damtfGisodK4sotG4Vc3wiLmTXmSHFT',
    explorerUrl: 'https://explorer.solana.com/address/HMtfKJDqiAbY6damtfGisodK4sotG4Vc3wiLmTXmSHFT',
  },
];

export function getToken(sym: string): TokenDefinition | undefined {
  return TOKENS.find((t) => t.sym === sym);
}

// ── Deterministic chart data ───────────────────────────────
// Uses a simple LCG seeded from string hash to avoid
// hydration mismatch between server and client renders.

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

export function getChartData(sym: string, points = 60): number[] {
  const token = getToken(sym);
  const direction = token?.direction ?? 'up';
  const seed = hashStr(sym);
  const rand = lcg(seed);

  const data: number[] = [];
  let val = 50;

  for (let i = 0; i < points; i++) {
    const drift = direction === 'up' ? 0.4 : -0.4;
    val = Math.max(5, Math.min(95, val + (rand() - 0.5 + drift * 0.3) * 8));
    data.push(val);
  }
  return data;
}
