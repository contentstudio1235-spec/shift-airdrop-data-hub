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
    baseMultiplier: 1.15, // 15% base bonus
  },

  // S&P 500 3x Long
  SPX3L: {
    mint: '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT',
    symbol: 'SPX3L',
    name: 'Shift S&P500 3x Long',
    baseMultiplier: 1.15, // 15% base bonus
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
