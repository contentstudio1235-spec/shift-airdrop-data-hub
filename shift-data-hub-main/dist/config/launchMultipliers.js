"use strict";
// ============================================================
// Launch Event Multiplier Configuration
// Controls time-based boost multipliers for the launch period.
// Can be overridden by admin API without redeploying.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LAUNCH_CONFIG = void 0;
exports.getLaunchConfig = getLaunchConfig;
exports.setLaunchConfig = setLaunchConfig;
exports.resetLaunchConfig = resetLaunchConfig;
exports.getLaunchPhase = getLaunchPhase;
// ── Default config ──────────────────────────────────────────────────────────
exports.DEFAULT_LAUNCH_CONFIG = {
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
let runtimeConfig = { ...exports.DEFAULT_LAUNCH_CONFIG };
function getLaunchConfig() {
    return { ...runtimeConfig };
}
function setLaunchConfig(config) {
    runtimeConfig = { ...runtimeConfig, ...config };
    console.log('[LaunchConfig] Updated:', runtimeConfig);
    return { ...runtimeConfig };
}
function resetLaunchConfig() {
    runtimeConfig = { ...exports.DEFAULT_LAUNCH_CONFIG };
    console.log('[LaunchConfig] Reset to defaults');
}
/**
 * Calculate which launch phase we're in and the multiplier to apply.
 */
function getLaunchPhase(now = new Date()) {
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
    }
    else if (daysIntoLaunch < 14) {
        const daysRemaining = 14 - daysIntoLaunch;
        return {
            phase: 'week2',
            multiplier: config.week2Multiplier,
            label: config.week2Label,
            daysIntoLaunch,
            daysRemainingInPhase: daysRemaining,
            countdownDisplay: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until steady state`,
        };
    }
    else {
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
//# sourceMappingURL=launchMultipliers.js.map