// frontend/lib/funnelTaxonomy.ts
// SINGLE SOURCE OF TRUTH for funnel display names, benchmarks, thresholds.
// Sourced from docs/agents/growth-hacker-2026-06-03.md §1-2 and
// docs/agents/analytics-reporter-2026-06-03.md §2.

import {
  Crosshair, Lightning, ArrowsClockwise, TrendUp, Trophy, Handshake, Repeat,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

export type FunnelId =
  | 'acquisition' | 'activation' | 'conversion'
  | 'whale_pipeline' | 'loyalty' | 'referral' | 'retention';

export interface StepBenchmark {
  red: number;     // %
  yellow: number;  // %
  green: number;   // %
}

export interface StepDisplay {
  id: string;
  name: string;
  benchmark?: StepBenchmark;
}

export interface FunnelDisplay {
  id: FunnelId;
  name: string;
  Icon: PhosphorIcon;
  description: string;
  steps: StepDisplay[];
}

export const FUNNEL_DISPLAY: Record<FunnelId, FunnelDisplay> = {
  acquisition: {
    id: 'acquisition',
    name: 'Acquisition',
    Icon: Crosshair,
    description: 'Anonymous traffic → identified-wallet user',
    steps: [
      { id: 'visit',       name: 'Landing' },
      { id: 'landing',     name: 'Wallet Modal Open', benchmark: { red: 8,  yellow: 15, green: 15 } },
      { id: 'connect',     name: 'Wallet Connect',    benchmark: { red: 35, yellow: 50, green: 50 } },
      { id: 'first_trade', name: 'First Trade',       benchmark: { red: 8,  yellow: 15, green: 15 } },
    ],
  },
  activation: {
    id: 'activation',
    name: 'Activation',
    Icon: Lightning,
    description: 'Wallet → trading-capable user',
    steps: [
      { id: 'connect',     name: 'Wallet Connected' },
      { id: 'register',    name: 'Account Registered' },
      { id: 'kyc',         name: 'KYC Complete',  benchmark: { red: 20, yellow: 35, green: 35 } },
      { id: 'first_trade', name: 'First Trade' },
    ],
  },
  conversion: {
    id: 'conversion',
    name: 'Conversion',
    Icon: ArrowsClockwise,
    description: 'First-trade user → repeat trader',
    steps: [
      { id: 'first_trade',   name: 'First Trade' },
      { id: 'second_trade',  name: 'Second Trade',     benchmark: { red: 25, yellow: 40, green: 40 } },
      { id: 'multi_asset',   name: 'Multi-Asset Trader' },
      { id: 'active_holder', name: 'Active Holder ($1K+)' },
    ],
  },
  whale_pipeline: {
    id: 'whale_pipeline',
    name: 'Whale Pipeline',
    Icon: TrendUp,
    description: 'Trader → high-volume whale',
    steps: [
      { id: 'holder',     name: 'Holder ($100+)' },
      { id: 'over_1k',    name: 'Silver Whale ($1K+)' },
      { id: 'over_10k',   name: 'Gold Whale ($10K+)',  benchmark: { red: 4, yellow: 9, green: 9 } },
      { id: 'over_100k',  name: 'Mega Whale ($100K+)' },
    ],
  },
  loyalty: {
    id: 'loyalty',
    name: 'Loyalty',
    Icon: Trophy,
    description: 'Trader → Snag-engaged user',
    steps: [
      { id: 'trader',      name: 'Trader' },
      { id: 'snag_linked', name: 'Snag Linked' },
      { id: 'badged',      name: 'First Badge' },
      { id: 'top_tier',    name: 'Top Tier' },
    ],
  },
  referral: {
    id: 'referral',
    name: 'Referral',
    Icon: Handshake,
    description: 'Viral loop completion',
    steps: [
      { id: 'user',             name: 'Eligible User' },
      { id: 'code_generated',   name: 'Code Generated' },
      { id: 'referral_clicked', name: 'Referral Clicked' },
      { id: 'referral_traded',  name: 'Referral Traded' },
    ],
  },
  retention: {
    id: 'retention',
    name: 'Retention',
    Icon: Repeat,
    description: 'Engagement decay & reactivation',
    steps: [
      { id: 'active',      name: 'Active Trader' },
      { id: 'dormant_7d',  name: 'Dormant 7d' },
      { id: 'reactivated', name: 'Reactivated' },
      { id: 'lost_30d',    name: 'Lost 30d' },
    ],
  },
};

export function getStepBenchmark(funnelId: FunnelId, stepIndex: number): StepBenchmark | undefined {
  return FUNNEL_DISPLAY[funnelId].steps[stepIndex]?.benchmark;
}

// Analytics Reporter §2.1 — Tier 1 hero thresholds
export type HeroKpiId =
  | 'new_holders_7d_wow'
  | 'volume_7d_wow'
  | 'viral_k_30d'
  | 'attribution_coverage_pct';

export function getThresholdsForKPI(id: HeroKpiId): StepBenchmark {
  const TABLE: Record<HeroKpiId, StepBenchmark> = {
    new_holders_7d_wow:        { red: -10, yellow: -5,  green: 10 },
    volume_7d_wow:             { red: -15, yellow: -5,  green: 10 },
    viral_k_30d:               { red: 0.20, yellow: 0.45, green: 0.45 },
    attribution_coverage_pct:  { red: 50, yellow: 80, green: 80 },
  };
  return TABLE[id];
}
