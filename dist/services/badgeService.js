"use strict";
// ============================================================
// Badge Eligibility Service — Determine who qualifies for badges
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeService = exports.BadgeService = void 0;
const pool_1 = require("../db/pool");
const eventService_1 = require("./eventService");
const holdingService_1 = require("./holdingService");
const realtimeSnagSyncService_1 = require("./realtimeSnagSyncService");
const config_1 = require("../config");
class BadgeService {
    /**
     * Evaluate all badge conditions for a single wallet.
     */
    async evaluateBadges(wallet) {
        const awards = [];
        const checks = await Promise.all([
            this.checkFirstTrade(wallet),
            this.checkDiamondHands(wallet),
            this.checkEarningsReactor(wallet),
            this.checkFOMCTrader(wallet),
            this.checkShiftHolder(wallet),
            // Event-based badges
            this.checkFedDayTrade(wallet),
            this.checkCPIBet(wallet),
            this.checkNewsReactor(wallet),
            this.checkEarningsConviction(wallet),
            this.checkGeopoliticalTrade(wallet),
        ]);
        for (const award of checks) {
            if (award)
                awards.push(award);
        }
        return awards;
    }
    /**
     * Evaluate badges for ALL users (called by cron).
     */
    async evaluateAllUsers() {
        const wallets = await (0, pool_1.query)('SELECT wallet FROM users');
        const allAwards = [];
        for (const { wallet } of wallets) {
            const awards = await this.evaluateBadges(wallet);
            allAwards.push(...awards);
        }
        console.log(`[Badges] ✅ Evaluated ${wallets.length} users, ${allAwards.length} new badges`);
        return allAwards;
    }
    /**
     * Badge: First Trade — user has at least one non-filtered position.
     */
    async checkFirstTrade(wallet) {
        if (await this.hasBadge(wallet, 'first_trade'))
            return null;
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions WHERE wallet = $1 AND status != 'filtered' LIMIT 1`, [wallet]);
        if (position) {
            await this.awardBadge(wallet, 'first_trade');
            return { badge_name: 'first_trade', wallet };
        }
        return null;
    }
    /**
     * Badge: Diamond Hands — any position held for 30+ days.
     */
    async checkDiamondHands(wallet) {
        if (await this.hasBadge(wallet, 'diamond_hands'))
            return null;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions 
       WHERE wallet = $1 AND status = 'open' AND opened_at <= $2 
       LIMIT 1`, [wallet, thirtyDaysAgo]);
        if (position) {
            await this.awardBadge(wallet, 'diamond_hands');
            return { badge_name: 'diamond_hands', wallet };
        }
        return null;
    }
    /**
     * Badge: Earnings Reactor — traded during an earnings event.
     */
    async checkEarningsReactor(wallet) {
        if (await this.hasBadge(wallet, 'earnings_reactor'))
            return null;
        // Get all earnings events
        const events = await eventService_1.eventService.getEventsByType('earnings');
        for (const event of events) {
            // Check if user opened a position during this event on an eligible asset
            const match = await (0, pool_1.queryOne)(`SELECT id FROM positions 
         WHERE wallet = $1 
         AND opened_at >= $2 AND opened_at <= $3 
         AND asset = ANY($4)
         AND status != 'filtered'
         LIMIT 1`, [wallet, event.start_time, event.end_time, event.eligible_assets]);
            if (match) {
                await this.awardBadge(wallet, 'earnings_reactor');
                return { badge_name: 'earnings_reactor', wallet };
            }
        }
        return null;
    }
    /**
     * Badge: FOMC Trader — traded during a macro event (FOMC, CPI).
     */
    async checkFOMCTrader(wallet) {
        if (await this.hasBadge(wallet, 'fomc_trader'))
            return null;
        const events = await eventService_1.eventService.getEventsByType('macro');
        for (const event of events) {
            const match = await (0, pool_1.queryOne)(`SELECT id FROM positions 
         WHERE wallet = $1 
         AND opened_at >= $2 AND opened_at <= $3 
         AND status != 'filtered'
         LIMIT 1`, [wallet, event.start_time, event.end_time]);
            if (match) {
                await this.awardBadge(wallet, 'fomc_trader');
                return { badge_name: 'fomc_trader', wallet };
            }
        }
        return null;
    }
    /**
     * Badge: SHIFT Holder — holds at least 1 SHIFT test token.
     */
    async checkShiftHolder(wallet) {
        if (await this.hasBadge(wallet, 'shift_holder'))
            return null;
        const isHolder = await holdingService_1.holdingService.holdsMinimum(wallet, config_1.config.shiftTokenMint, 1);
        if (isHolder) {
            await this.awardBadge(wallet, 'shift_holder');
            return { badge_name: 'shift_holder', wallet };
        }
        return null;
    }
    // ── Event-Based Badges ──
    /**
     * Badge: Fed Day Trade — opened position on FOMC announcement day (+1.20x Dynamic, 14 days)
     */
    async checkFedDayTrade(wallet) {
        if (await this.hasBadge(wallet, 'fed_day_trade'))
            return null;
        const now = new Date();
        const events = await eventService_1.eventService.getEventsByType('macro');
        for (const event of events) {
            if (event.event_name.toUpperCase().includes('FOMC')) {
                const eligible = await eventService_1.eventService.checkEventEligibility(wallet, event.id);
                if (eligible) {
                    await this.awardBadge(wallet, 'fed_day_trade');
                    return { badge_name: 'fed_day_trade', wallet };
                }
            }
        }
        return null;
    }
    /**
     * Badge: CPI Bet — opened position on CPI release day (+1.15x Dynamic, 7 days)
     */
    async checkCPIBet(wallet) {
        if (await this.hasBadge(wallet, 'cpi_bet'))
            return null;
        const events = await eventService_1.eventService.getEventsByType('macro');
        for (const event of events) {
            if (event.event_name.toUpperCase().includes('CPI')) {
                const eligible = await eventService_1.eventService.checkEventEligibility(wallet, event.id);
                if (eligible) {
                    await this.awardBadge(wallet, 'cpi_bet');
                    return { badge_name: 'cpi_bet', wallet };
                }
            }
        }
        return null;
    }
    /**
     * Badge: News Reactor — opened within 60m of market-moving headline (+1.15x Dynamic, 7 days)
     */
    async checkNewsReactor(wallet) {
        if (await this.hasBadge(wallet, 'news_reactor'))
            return null;
        const recentNews = await eventService_1.eventService.getRecentNews(24); // Last 24 hours
        for (const headline of recentNews) {
            const eligible = await eventService_1.eventService.checkNewsReactorEligibility(wallet, headline.id, 60);
            if (eligible) {
                await this.awardBadge(wallet, 'news_reactor');
                return { badge_name: 'news_reactor', wallet };
            }
        }
        return null;
    }
    /**
     * Badge: Earnings Conviction — opened 24h before earnings, held through report (+1.20x Permanent)
     */
    async checkEarningsConviction(wallet) {
        if (await this.hasBadge(wallet, 'earnings_conviction'))
            return null;
        const events = await eventService_1.eventService.getEventsByType('earnings');
        for (const event of events) {
            // Check if position opened 24h BEFORE earnings event
            const oneHourBefore = new Date(event.start_time.getTime() - 24 * 60 * 60 * 1000);
            const match = await (0, pool_1.queryOne)(`SELECT id FROM positions
         WHERE wallet = $1
         AND opened_at >= $2 AND opened_at <= $3
         AND (asset = ANY($4))
         AND status = 'closed'
         AND closed_at >= $5
         LIMIT 1`, [wallet, oneHourBefore, event.start_time, event.eligible_assets || [], event.end_time]);
            if (match) {
                await this.awardBadge(wallet, 'earnings_conviction');
                return { badge_name: 'earnings_conviction', wallet };
            }
        }
        return null;
    }
    /**
     * Badge: Geopolitical Trade — opened during major geopolitical event (+1.20x Permanent)
     */
    async checkGeopoliticalTrade(wallet) {
        if (await this.hasBadge(wallet, 'geopolitical_trade'))
            return null;
        const events = await eventService_1.eventService.getEventsByType('geopolitical');
        for (const event of events) {
            const eligible = await eventService_1.eventService.checkEventEligibility(wallet, event.id);
            if (eligible) {
                await this.awardBadge(wallet, 'geopolitical_trade');
                return { badge_name: 'geopolitical_trade', wallet };
            }
        }
        return null;
    }
    // ── Helpers ──
    /**
     * Check if wallet already has a specific badge.
     */
    async hasBadge(wallet, badgeName) {
        const badge = await (0, pool_1.queryOne)('SELECT id FROM badges WHERE wallet = $1 AND badge_name = $2', [wallet, badgeName]);
        return !!badge;
    }
    /**
     * Award a badge to a wallet + queue immediate real-time SNAG sync.
     */
    async awardBadge(wallet, badgeName) {
        await (0, pool_1.execute)(`INSERT INTO badges (wallet, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [wallet, badgeName]);
        console.log(`[Badges] 🏆 Awarded "${badgeName}" to ${wallet.slice(0, 8)}...`);
        // Queue immediate sync to SNAG (badges are not debounced — sync immediately)
        await realtimeSnagSyncService_1.realtimeSnagSyncService.queueBadgeSync(wallet, badgeName);
    }
    /**
     * Get all badges for a wallet.
     */
    async getBadges(wallet) {
        return (0, pool_1.query)('SELECT badge_name, earned_at FROM badges WHERE wallet = $1 ORDER BY earned_at', [wallet]);
    }
    /**
     * Get badge progress info for psychology hooks.
     */
    async getBadgeProgress(wallet) {
        const badges = await this.getBadges(wallet);
        const earnedNames = new Set(badges.map(b => b.badge_name));
        const now = new Date();
        const progress = [];
        // First Trade
        if (earnedNames.has('first_trade')) {
            progress.push({ badge: 'first_trade', earned: true, progress: 1, description: 'First trade completed!' });
        }
        else {
            progress.push({ badge: 'first_trade', earned: false, progress: 0, description: 'Make your first trade' });
        }
        // Diamond Hands
        if (earnedNames.has('diamond_hands')) {
            progress.push({ badge: 'diamond_hands', earned: true, progress: 1, description: 'Diamond Hands achieved!' });
        }
        else {
            // Find longest held open position
            const oldest = await (0, pool_1.queryOne)(`SELECT opened_at FROM positions WHERE wallet = $1 AND status = 'open' ORDER BY opened_at ASC LIMIT 1`, [wallet]);
            if (oldest) {
                const daysHeld = (now.getTime() - new Date(oldest.opened_at).getTime()) / (1000 * 60 * 60 * 24);
                const progressPct = Math.min(daysHeld / 30, 1);
                const remaining = Math.max(0, Math.ceil(30 - daysHeld));
                progress.push({
                    badge: 'diamond_hands',
                    earned: false,
                    progress: progressPct,
                    description: remaining > 0 ? `${remaining} days until Diamond Hands 💎` : 'Almost there!'
                });
            }
            else {
                progress.push({ badge: 'diamond_hands', earned: false, progress: 0, description: 'Hold a position for 30 days' });
            }
        }
        // Earnings Reactor
        progress.push({
            badge: 'earnings_reactor',
            earned: earnedNames.has('earnings_reactor'),
            progress: earnedNames.has('earnings_reactor') ? 1 : 0,
            description: earnedNames.has('earnings_reactor') ? 'Earnings Reactor earned!' : 'Trade during an earnings event',
        });
        // FOMC Trader
        progress.push({
            badge: 'fomc_trader',
            earned: earnedNames.has('fomc_trader'),
            progress: earnedNames.has('fomc_trader') ? 1 : 0,
            description: earnedNames.has('fomc_trader') ? 'FOMC Trader earned!' : 'Trade during a macro event (FOMC/CPI)',
        });
        // SHIFT Holder
        progress.push({
            badge: 'shift_holder',
            earned: earnedNames.has('shift_holder'),
            progress: earnedNames.has('shift_holder') ? 1 : 0,
            description: earnedNames.has('shift_holder') ? 'Official SHIFT Holder!' : 'Hold at least 1 SHIFT token',
        });
        return progress;
    }
}
exports.BadgeService = BadgeService;
exports.badgeService = new BadgeService();
//# sourceMappingURL=badgeService.js.map