// ============================================================
// SHIFT Airdrop — Token Definitions & Chart Data
// ============================================================

import type { TokenDefinition } from './types';

export const TOKENS: TokenDefinition[] = [
  {
    sym: 'TSL2L',
    name: 'Shift Tesla 2x Long',
    price: 45.20,
    change: 8.40,
    changePct: 22.80,
    direction: 'up',
    mint: '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    baseMultiplier: 1.2,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily TSLA Bull 2X ETF',
    imageUrl: '/tokens/TSL2L.svg',
    alpacaSymbol: 'TSLL',
    underlyingEtf: 'Direxion Daily TSLA Bull 2X ETF',
    isin: 'US25460G2865',
    solscanUrl: 'https://solscan.io/token/6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    explorerUrl: 'https://explorer.solana.com/address/6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
  },
  {
    sym: 'TSL1S',
    name: 'Shift Tesla 1x Short',
    price: 28.15,
    change: -3.50,
    changePct: -11.00,
    direction: 'down',
    mint: 'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
    baseMultiplier: 1.1,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily TSLA Bear 1X ETF',
    imageUrl: '/tokens/TSL1S.svg',
    alpacaSymbol: 'TSLS',
    underlyingEtf: 'Direxion Daily TSLA Bear 1X ETF',
    isin: 'US25460G2600',
    solscanUrl: 'https://solscan.io/token/bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
    explorerUrl: 'https://explorer.solana.com/address/bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
  },
  {
    sym: 'SOX3L',
    name: 'Shift Semiconductor 3x Long',
    price: 156.80,
    change: 18.20,
    changePct: 13.10,
    direction: 'up',
    mint: 'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
    baseMultiplier: 1.25,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily Semiconductor Bull 3X ETF',
    imageUrl: '/tokens/SOX3L.svg',
    alpacaSymbol: 'SOXL',
    underlyingEtf: 'Direxion Daily Semiconductor Bull 3X ETF',
    isin: 'US25459W4583',
    solscanUrl: 'https://solscan.io/token/Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
    explorerUrl: 'https://explorer.solana.com/address/Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
  },
  {
    sym: 'SOX3S',
    name: 'Shift Semiconductor 3x Short',
    price: 12.45,
    change: -2.10,
    changePct: -14.40,
    direction: 'down',
    mint: '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
    baseMultiplier: 1.25,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily Semiconductor Bear 3X ETF',
    imageUrl: '/tokens/SOX3S.svg',
    alpacaSymbol: 'SOXS',
    underlyingEtf: 'Direxion Daily Semiconductor Bear 3X ETF',
    isin: 'US25461H5726',
    solscanUrl: 'https://solscan.io/token/7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
    explorerUrl: 'https://explorer.solana.com/address/7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
  },
  {
    sym: 'SPX3L',
    name: 'Shift S&P500 3x Long',
    price: 89.60,
    change: 12.50,
    changePct: 16.20,
    direction: 'up',
    mint: '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
    baseMultiplier: 1.15,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily S&P 500 Bull 3X ETF',
    imageUrl: '/tokens/SPX3L.svg',
    alpacaSymbol: 'SPXL',
    underlyingEtf: 'Direxion Daily S&P 500 Bull 3X ETF',
    isin: 'US25459W8626',
    solscanUrl: 'https://solscan.io/token/12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
    explorerUrl: 'https://explorer.solana.com/address/12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
  },
  {
    sym: 'SPX3S',
    name: 'Shift S&P500 3x Short',
    price: 31.20,
    change: -4.80,
    changePct: -13.30,
    direction: 'down',
    mint: '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
    baseMultiplier: 1.15,
    description: 'Membership interest Shift Series tokens 1:1 backed by and tracking the price of Direxion Daily S&P 500 Bear 3X ETF',
    imageUrl: '/tokens/SPX3S.svg',
    alpacaSymbol: 'SPXS',
    underlyingEtf: 'Direxion Daily S&P 500 Bear 3X ETF',
    isin: 'US25460E1901',
    solscanUrl: 'https://solscan.io/token/67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
    explorerUrl: 'https://explorer.solana.com/address/67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
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
