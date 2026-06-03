// frontend/lib/chartTokens.ts
// Color + motion tokens for the Data Hub. Inline-style only — no Tailwind.

import type { StepBenchmark } from './funnelTaxonomy';

export const TOKENS = {
  bg: '#030d0a',
  panel: 'rgba(8,18,14,0.9)',
  panelDeep: 'rgba(4,10,8,0.95)',
  glassBlur: '12px',

  accent: '#00c896',
  accentDim: 'rgba(0,200,150,0.15)',
  accentBorder: 'rgba(0,200,150,0.2)',
  accentGlow: '0 0 24px rgba(0,200,150,0.4)',

  textPrimary: '#ffffff',
  textSecondary: '#9fb5aa',
  textMuted: '#5a9070',
  textFaint: '#3a7060',

  threshold: {
    green: '#5ee0a8',
    yellow: '#ff9a3c',
    red: '#ff5a5a',
  },

  chartGrid: 'rgba(255,255,255,0.04)',
  chartFill: 'rgba(255,255,255,0.03)',
} as const;

export const MOTION = {
  fast: '120ms ease-out',
  medium: '400ms cubic-bezier(0.4,0,0.2,1)',
  slow: '1200ms cubic-bezier(0.16,1,0.3,1)',
} as const;

// thresholdColor — Analytics Reporter §2.4
// Inputs: value (the metric), thresholds { red, yellow, green }
// Output: hex color string
// Behavior: green if >= green, yellow if >= yellow and < green, red otherwise.
// For descending-good metrics (lower = better), caller MUST pass thresholds with red > yellow > green.
export function thresholdColor(value: number, t: StepBenchmark): string {
  if (value >= t.green) return TOKENS.threshold.green;
  if (value >= t.yellow) return TOKENS.threshold.yellow;
  return TOKENS.threshold.red;
}
