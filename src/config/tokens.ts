// ============================================================
// Tracked Tokens Configuration
// RWA Tokens for position holding multiplier
// ============================================================

interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  baseMultiplier: number;
}

export const TRACKED_TOKENS: Record<string, TokenInfo> = {
  // SHIFT Governance Token — holding gives shift_holder badge + XP generation
  SHIFT: {
    mint: '5dVc9YuDZ3wRbohosa8bwXoj1v6zMvipwr38LFEA7MLJ',
    symbol: 'SHIFT',
    name: 'Shift RWA Token',
    baseMultiplier: 1.3, // 30% base bonus — SHIFT holders get premium XP
  },

  // Tesla 2x Long
  TSL2L: {
    mint: '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT',
    symbol: 'TSL2L',
    name: 'Shift Tesla 2x Long',
    baseMultiplier: 1.2, // 20% base bonus for RWA tokens
  },

  // Tesla 1x Short
  TSL1S: {
    mint: 'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT',
    symbol: 'TSL1S',
    name: 'Shift Tesla 1x Short',
    baseMultiplier: 1.1, // 10% base bonus
  },

  // Semiconductor 3x Long
  SOX3L: {
    mint: 'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT',
    symbol: 'SOX3L',
    name: 'Shift Semiconductor 3x Long',
    baseMultiplier: 1.25, // 25% base bonus (higher volatility)
  },

  // Semiconductor 3x Short
  SOX3S: {
    mint: '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT',
    symbol: 'SOX3S',
    name: 'Shift Semiconductor 3x Short',
    baseMultiplier: 1.25, // 25% base bonus
  },

  // S&P 500 3x Short
  SPX3S: {
    mint: '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT',
    symbol: 'SPX3S',
    name: 'Shift S&P500 3x Short',
    baseMultiplier: 1.25, // 25% base bonus (upgraded from 15% to match semiconductor tier)
  },

  // S&P 500 3x Long
  SPX3L: {
    mint: '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
    symbol: 'SPX3L',
    name: 'Shift S&P500 3x Long',
    baseMultiplier: 1.25,
  },

  // ── SpaceX Series (launch week 2026-06) ──────────────────────────────────
  // Higher base multiplier during SpaceX launch week to reward early adopters.

  // SpaceX 2x Long (Direxion Daily SpaceX Bull 2X ETF — ticker LOFF)
  SPCX2L: {
    mint: 'BcVDiSc5DTp8imZE4Nx2abUhhgA3KCxJ4M5g7aHLSHFT',
    symbol: 'SPCX2L',
    name: 'Shift SpaceX 2x Long',
    baseMultiplier: 1.35, // 35% launch bonus — pioneer multiplier
  },

  // SpaceX 2x Short (Direxion Daily SpaceX Bear 2X ETF)
  SPCX2S: {
    mint: 'FtBpBcLU4Epjm2nnuQNRYGkFM6jfsXrcGKJSiKCtSHFT',
    symbol: 'SPCX2S',
    name: 'Shift SpaceX 2x Short',
    baseMultiplier: 1.35,
  },

  // SpaceX 1x (direct SpaceX stock tracking — ISIN US84615Q1031)
  SPCX1L: {
    mint: 'HMtfKJDqiAbY6damtfGisodK4sotG4Vc3wiLmTXmSHFT',
    symbol: 'SPCX1L',
    name: 'Shift SpaceX',
    baseMultiplier: 1.30, // 30% bonus for SpaceX stock exposure
  },
};

// Get token info by mint address
export function getTokenInfo(mint: string) {
  for (const token of Object.values(TRACKED_TOKENS)) {
    if (token.mint === mint) {
      return token;
    }
  }
  return null;
}

// Check if token is tracked
export function isTrackedToken(mint: string): boolean {
  return getTokenInfo(mint) !== null;
}

// Get all tracked mints (for filtering)
export function getTrackedMints(): string[] {
  return Object.values(TRACKED_TOKENS).map(t => t.mint);
}
