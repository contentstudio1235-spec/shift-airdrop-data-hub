"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../db/pool");
const snagSyncService_1 = require("../services/snagSyncService");
const dailyCheckinService_1 = require("../services/dailyCheckinService");
const leaderboardService_1 = require("../services/leaderboardService");
const activityFeedService_1 = require("../services/activityFeedService");
const missionsService_1 = require("../services/missionsService");
const badgeGalleryService_1 = require("../services/badgeGalleryService");
const referralTrackingService_1 = require("../services/referralTrackingService");
const levelSystem_1 = require("../utils/levelSystem");
const router = (0, express_1.Router)();
// Get dashboard summary for a specific wallet
router.get('/:wallet', async (req, res) => {
    const { wallet } = req.params;
    try {
        // 1. Get user stats & SNAG points in parallel
        const [user, loyaltyPoints] = await Promise.all([
            (0, pool_1.queryOne)('SELECT total_xp, claim_multiplier, current_streak FROM users WHERE wallet = $1', [wallet]),
            snagSyncService_1.snagSyncService.getUserPoints(wallet)
        ]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // 2. Get local rank
        const rankResult = await (0, pool_1.queryOne)('SELECT COUNT(*) + 1 as rank FROM users WHERE total_xp > $1', [user.total_xp]);
        // 3. Get active positions count
        const positionsResult = await (0, pool_1.queryOne)(`SELECT COUNT(*) as count FROM positions WHERE wallet = $1 AND status IN ('open', 'active')`, [wallet]);
        res.json({
            wallet,
            totalXp: Number(user.total_xp),
            loyaltyPoints: Number(loyaltyPoints),
            claimMultiplier: Number(user.claim_multiplier),
            currentStreak: user.current_streak,
            rank: parseInt(rankResult?.rank || '0', 10),
            activePositions: parseInt(positionsResult?.count || '0', 10),
            projectedAllocation: 'TBD'
        });
    }
    catch (error) {
        console.error('[API] Dashboard fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Daily checkin — process daily streak
router.post('/:wallet/checkin', async (req, res) => {
    const { wallet } = req.params;
    try {
        const result = await dailyCheckinService_1.dailyCheckinService.processDailyCheckin(wallet);
        res.json({
            wallet,
            streakCount: result.streakCount,
            xpAwarded: result.xpAwarded,
            isNewStreak: result.isNewStreak,
            message: `+${result.xpAwarded} XP! ${result.streakCount} day streak 🔥`
        });
    }
    catch (error) {
        console.error('[API] Daily checkin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's streak info
router.get('/:wallet/streak', async (req, res) => {
    const { wallet } = req.params;
    try {
        const streakInfo = await dailyCheckinService_1.dailyCheckinService.getStreakInfo(wallet);
        res.json(streakInfo);
    }
    catch (error) {
        console.error('[API] Streak info error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get top 100 leaderboard
router.get('/leaderboard/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const leaderboard = await leaderboardService_1.leaderboardService.getTopLeaderboard(limit);
        res.json({
            count: leaderboard.length,
            entries: leaderboard
        });
    }
    catch (error) {
        console.error('[API] Leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's rank and percentile
router.get('/:wallet/rank', async (req, res) => {
    const { wallet } = req.params;
    try {
        const position = await leaderboardService_1.leaderboardService.getUserRank(wallet);
        if (!position) {
            return res.status(404).json({ error: 'User not found on leaderboard' });
        }
        res.json(position);
    }
    catch (error) {
        console.error('[API] User rank error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get leaderboard around user (context window)
router.get('/:wallet/leaderboard-context', async (req, res) => {
    const { wallet } = req.params;
    const context = parseInt(req.query.context) || 5;
    try {
        const entries = await leaderboardService_1.leaderboardService.getLeaderboardAround(wallet, context);
        res.json({
            count: entries.length,
            entries
        });
    }
    catch (error) {
        console.error('[API] Leaderboard context error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user level info
router.get('/:wallet/level', async (req, res) => {
    const { wallet } = req.params;
    try {
        const user = await (0, pool_1.queryOne)('SELECT total_xp FROM users WHERE wallet = $1', [wallet]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const levelInfo = (0, levelSystem_1.getUserLevelInfo)(Number(user.total_xp));
        res.json(levelInfo);
    }
    catch (error) {
        console.error('[API] Level info error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── Sprint 2: Activity Feed, Missions, Badges, Referrals ──
// Get activity feed
router.get('/:wallet/activity', async (req, res) => {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const activity = await activityFeedService_1.activityFeedService.getUserActivity(wallet, limit);
        res.json({
            count: activity.length,
            events: activity
        });
    }
    catch (error) {
        console.error('[API] Activity feed error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get global activity feed
router.get('/activity/global', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    try {
        const activity = await activityFeedService_1.activityFeedService.getGlobalActivity(limit);
        res.json({
            count: activity.length,
            events: activity
        });
    }
    catch (error) {
        console.error('[API] Global activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get weekly missions
router.get('/:wallet/missions', async (req, res) => {
    const { wallet } = req.params;
    try {
        const [missions, progress] = await Promise.all([
            missionsService_1.missionsService.getWeeklyMissions(),
            missionsService_1.missionsService.getUserMissionProgress(wallet)
        ]);
        const totalWeeklyXp = await missionsService_1.missionsService.getWeeklyMissionXp(wallet);
        res.json({
            missions,
            progress,
            totalWeeklyXp
        });
    }
    catch (error) {
        console.error('[API] Missions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Claim mission reward
router.post('/:wallet/missions/:missionId/claim', async (req, res) => {
    const { wallet, missionId } = req.params;
    try {
        const xpAwarded = await missionsService_1.missionsService.claimMissionReward(wallet, missionId);
        res.json({
            success: true,
            xpAwarded,
            message: `+${xpAwarded} XP claimed!`
        });
    }
    catch (error) {
        console.error('[API] Mission claim error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get badge gallery
router.get('/:wallet/badges/gallery', async (req, res) => {
    const { wallet } = req.params;
    try {
        const [badges, breakdown, count] = await Promise.all([
            badgeGalleryService_1.badgeGalleryService.getUserBadges(wallet),
            badgeGalleryService_1.badgeGalleryService.getRarityBreakdown(wallet),
            badgeGalleryService_1.badgeGalleryService.getEarnedBadgeCount(wallet)
        ]);
        res.json({
            badges,
            breakdown,
            earnedCount: count,
            totalCount: badges.length
        });
    }
    catch (error) {
        console.error('[API] Badge gallery error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get referral stats
router.get('/:wallet/referrals/stats', async (req, res) => {
    const { wallet } = req.params;
    try {
        const [stats, referred, referrer, networkXp, leaderboard] = await Promise.all([
            referralTrackingService_1.referralTrackingService.getReferrerStats(wallet),
            referralTrackingService_1.referralTrackingService.getReferredUsers(wallet, 10),
            referralTrackingService_1.referralTrackingService.getMyReferrer(wallet),
            referralTrackingService_1.referralTrackingService.getNetworkXp(wallet),
            referralTrackingService_1.referralTrackingService.getReferralLeaderboard(50)
        ]);
        res.json({
            myStats: stats,
            referredUsers: referred,
            myReferrer: referrer,
            networkXp,
            leaderboard
        });
    }
    catch (error) {
        console.error('[API] Referral stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map