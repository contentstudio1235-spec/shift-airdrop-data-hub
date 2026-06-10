/**
 * Referral API Routes
 *
 * Source of truth: `referrals` table (14,232+ rows, covers SHIFT + Snag links)
 *
 * PERMANENT $5 ACTIVATION REQUIREMENT (Referral System v2):
 * - Active = referred wallet holds >= $5 combined in any SHIFT RWA asset
 * - This is a PERMANENT quality gate, not subject to removal or change
 * - Applies to ALL referrals (new and legacy)
 * - Legacy balance claims require referred wallet to meet this threshold
 *
 * Nudge-eligible = registered but inactive (< $5 holding) — targetable for push
 *
 * Endpoints:
 *   GET  /api/referral/:wallet              - Dashboard (stats + SP breakdown)
 *   GET  /api/referral/:wallet/referred     - Full list of referred wallets
 *   GET  /api/referral/:wallet/nudge        - Only inactive referred wallets (for nudge)
 *   POST /api/referral/:wallet/claim-legacy - Claim legacy pending SP
 *   GET  /api/referral/leaderboard          - Leaderboard sorted by various metrics
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=referralRoutes.d.ts.map