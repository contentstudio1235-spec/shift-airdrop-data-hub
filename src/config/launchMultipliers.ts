// ============================================================
// Launch Event Multiplier Configuration
// Controls time-based boost multipliers for the launch period.
// Can be overridden by admin API without redeploying.
// ============================================================

export interface LaunchMultiplierConfig {
  // Launch start date (UTC)
  launchStartDate: string; // ISO 8601, e.g. "2026-05-25T00:00:00Z"

  // Week 1 (days 1-7): entry incentive
  week1Multiplier: number; // default 3.0x

  // Week 2 (days 8-14): sustained participation
  week2Multiplier: number; // default 2.0x

  // Week 3+ (day 15+): normal baseline
  week3PlusMultiplier: number; // default 1.0x

  // UI text for each phase
  week1Label: string; // e.g. "🚀 LAUNCH WEEK"
  week2Label: string; // e.g. "🔥 MOMENTUM WEEK"
  week3PlusLabel: string; // e.g. "⭐ STEADY STATE"

  // Whether boosts are active
  isActive: boolean;
}

// ── Default config ──────────────────────────────────────────────────────────

export const DEFAULT_LAUNCH_CONFIG: LaunchMultiplierConfig = {
  launchStartDate: process.env.LAUNCH_START_DATE || '2026-05-25T00:00:00Z',
  week1Multiplier: parseFloat(process.env.LAUNCH_WEEK1_MULTIPLIER || '3.0'),
  week2Multiplier: parseFloat(process.env.LAUNCH_WEEK2_MULTIPLIER || '2.0'),
  week3PlusMultiplier: parseFloat(process.env.LAUNCH_WEEK3PLUS_MULTIPLIER || '1.0'),
  week1Label: '🚀 LAUNCH WEEK',
  week2Label: '🔥 MOMENTUM WEEK',
  week3PlusLabel: '⭐ STEADY STATE',
  isActive: process.env.LAUNCH_ACTIVE !== 'false', // enabled by default
};

// ── Runtime config (can be updated by admin without redeploy) ──────────────

let runtimeConfig = { ...DEFAULT_LAUNCH_CONFIG };

export function getLaunchConfig(): LaunchMultiplierConfig {
  return { ...runtimeConfig };
}

export function setLaunchConfig(config: Partial<LaunchMultiplierConfig>): LaunchMultiplierConfig {
  runtimeConfig = { ...runtimeConfig, ...config };
  console.log('[LaunchConfig] Updated:', runtimeConfig);
  return { ...runtimeConfig };
}

export function resetLaunchConfig(): void {
  runtimeConfig = { ...DEFAULT_LAUNCH_CONFIG };
  console.log('[LaunchConfig] Reset to defaults');
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export interface LaunchPhaseInfo {
  phase: 'week1' | 'week2' | 'week3plus';
  multiplier: number;
  label: string;
  daysIntoLaunch: number;
  daysRemainingInPhase: number;
  countdownDisplay: string; // e.g. "5 days until Week 2"
}

/**
 * Calculate which launch phase we're in and the multiplier to apply.
 */
export function getLaunchPhase(now: Date = new Date()): LaunchPhaseInfo {
  const config = getLaunchConfig();

  if (!config.isActive) {
    return {
      phase: 'week3plus',
      multiplier: 1.0,
      label: 'Launch ended',
      daysIntoLaunch: 0,
      daysRemainingInPhase: 0,
      countdownDisplay: 'N/A',
    };
  }

  const launchDate = new Date(config.launchStartDate);
  const diffMs = now.getTime() - launchDate.getTime();
  const daysIntoLaunch = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Determine phase
  if (daysIntoLaunch < 7) {
    const daysRemaining = 7 - daysIntoLaunch;
    return {
      phase: 'week1',
      multiplier: config.week1Multiplier,
      label: config.week1Label,
      daysIntoLaunch,
      daysRemainingInPhase: daysRemaining,
      countdownDisplay: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until Week 2`,
    };
  } else if (daysIntoLaunch < 14) {
    const daysRemaining = 14 - daysIntoLaunch;
    return {
      phase: 'week2',
      multiplier: config.week2Multiplier,
      label: config.week2Label,
      daysIntoLaunch,
      daysRemainingInPhase: daysRemaining,
      countdownDisplay: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until steady state`,
    };
  } else {
    return {
      phase: 'week3plus',
      multiplier: config.week3PlusMultiplier,
      label: config.week3PlusLabel,
      daysIntoLaunch,
      daysRemainingInPhase: 0,
      countdownDisplay: 'Launch phase complete',
    };
  }
}
