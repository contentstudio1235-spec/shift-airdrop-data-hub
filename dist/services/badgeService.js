"use strict";
// ============================================================
// Badge Eligibility Service — Determine who qualifies for badges
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeService = exports.BadgeService = void 0;
const pool_1 = require("../db/pool");
const positionService_1 = require("./positionService");
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
            // ── Core position badges ──
            this.checkFirstTrade(wallet),
            this.checkDiamondHands7d(wallet),
            this.checkDiamondHands(wallet),
            this.checkLongHauler(wallet),
            this.checkTheBeliever(wallet),
            // ── Volume badges ──
            this.checkVolumeVeteranI(wallet),
            this.checkVolumeVeteranII(wallet),
            this.checkVolumeVeteranIII(wallet),
            // ── Stacking badges ──
            this.checkDoubledDown(wallet),
            this.checkTripleDown(wallet),
            this.checkConvictionStack(wallet),
            this.checkPyramidUp(wallet),
            // ── Social badges ──
            this.checkCommunityBuilder(wallet),
            this.checkReferralKing(wallet),
            // ── XP badges ──
            this.checkLegend(wallet),
            // ── OG badge ──
            this.checkTheOG(wallet),
            // ── Earnings badges ──
            this.checkEarningsReactor(wallet),
            this.checkMultiEarningsHolder(wallet),
            this.checkFOMCTrader(wallet),
            // shift_holder is checked on wallet connect only (not in cron) to avoid
            // Helius RPC calls for every user every tick. See walletSyncService.
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
     * Badge: Diamond Hands — any position held for 60+ days.
     */
    async checkDiamondHands(wallet) {
        if (await this.hasBadge(wallet, 'diamond_hands'))
            return null;
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions
       WHERE wallet = $1 AND status = 'open' AND opened_at <= $2
       LIMIT 1`, [wallet, sixtyDaysAgo]);
        if (position) {
            await this.awardBadge(wallet, 'diamond_hands');
            return { badge_name: 'diamond_hands', wallet };
        }
        return null;
    }
    /**
     * Badge: Long-Hauler — any position held for 90+ days.
     */
    async checkLongHauler(wallet) {
        if (await this.hasBadge(wallet, 'long_hauler'))
            return null;
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions
       WHERE wallet = $1 AND status = 'open' AND opened_at <= $2
       LIMIT 1`, [wallet, ninetyDaysAgo]);
        if (position) {
            await this.awardBadge(wallet, 'long_hauler');
            return { badge_name: 'long_hauler', wallet };
        }
        return null;
    }
    /**
     * Badge: The Believer — any position held for 180+ days.
     */
    async checkTheBeliever(wallet) {
        if (await this.hasBadge(wallet, 'the_believer'))
            return null;
        const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions
       WHERE wallet = $1 AND status = 'open' AND opened_at <= $2
       LIMIT 1`, [wallet, oneEightyDaysAgo]);
        if (position) {
            await this.awardBadge(wallet, 'the_believer');
            return { badge_name: 'the_believer', wallet };
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
    // ── New DB-computable badge checks ──
    /**
     * Badge: Diamond Hands 7d — any open position held for 7+ days.
     */
    async checkDiamondHands7d(wallet) {
        if (await this.hasBadge(wallet, 'diamond_hands_7d'))
            return null;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions WHERE wallet = $1 AND status = 'open' AND opened_at <= $2 LIMIT 1`, [wallet, sevenDaysAgo]);
        if (position) {
            await this.awardBadge(wallet, 'diamond_hands_7d');
            return { badge_name: 'diamond_hands_7d', wallet };
        }
        return null;
    }
    /**
     * Badge: Volume Veteran I — 5+ total trades (testnet: count-based).
     */
    async checkVolumeVeteranI(wallet) {
        if (await this.hasBadge(wallet, 'volume_veteran_i'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT COUNT(*) as cnt FROM positions WHERE wallet = $1 AND status != 'filtered'`, [wallet]);
        if (res && parseInt(res.cnt) >= 5) {
            await this.awardBadge(wallet, 'volume_veteran_i');
            return { badge_name: 'volume_veteran_i', wallet };
        }
        return null;
    }
    /**
     * Badge: Volume Veteran II — 25+ total trades.
     */
    async checkVolumeVeteranII(wallet) {
        if (await this.hasBadge(wallet, 'volume_veteran_ii'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT COUNT(*) as cnt FROM positions WHERE wallet = $1 AND status != 'filtered'`, [wallet]);
        if (res && parseInt(res.cnt) >= 25) {
            await this.awardBadge(wallet, 'volume_veteran_ii');
            return { badge_name: 'volume_veteran_ii', wallet };
        }
        return null;
    }
    /**
     * Badge: Volume Veteran III — 100+ total trades.
     */
    async checkVolumeVeteranIII(wallet) {
        if (await this.hasBadge(wallet, 'volume_veteran_iii'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT COUNT(*) as cnt FROM positions WHERE wallet = $1 AND status != 'filtered'`, [wallet]);
        if (res && parseInt(res.cnt) >= 100) {
            await this.awardBadge(wallet, 'volume_veteran_iii');
            return { badge_name: 'volume_veteran_iii', wallet };
        }
        return null;
    }
    /**
     * Badge: Doubled Down — 2+ positions on the same asset.
     */
    async checkDoubledDown(wallet) {
        if (await this.hasBadge(wallet, 'doubled_down'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT asset FROM positions WHERE wallet = $1 AND status != 'filtered'
       GROUP BY asset HAVING COUNT(*) >= 2 LIMIT 1`, [wallet]);
        if (res) {
            await this.awardBadge(wallet, 'doubled_down');
            return { badge_name: 'doubled_down', wallet };
        }
        return null;
    }
    /**
     * Badge: Triple Down — 3+ positions on the same asset.
     */
    async checkTripleDown(wallet) {
        if (await this.hasBadge(wallet, 'triple_down'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT asset FROM positions WHERE wallet = $1 AND status != 'filtered'
       GROUP BY asset HAVING COUNT(*) >= 3 LIMIT 1`, [wallet]);
        if (res) {
            await this.awardBadge(wallet, 'triple_down');
            return { badge_name: 'triple_down', wallet };
        }
        return null;
    }
    /**
     * Badge: Conviction Stack — 4+ positions on the same asset.
     */
    async checkConvictionStack(wallet) {
        if (await this.hasBadge(wallet, 'conviction_stack'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT asset FROM positions WHERE wallet = $1 AND status != 'filtered'
       GROUP BY asset HAVING COUNT(*) >= 4 LIMIT 1`, [wallet]);
        if (res) {
            await this.awardBadge(wallet, 'conviction_stack');
            return { badge_name: 'conviction_stack', wallet };
        }
        return null;
    }
    /**
     * Badge: Pyramid Up — 5+ positions on the same asset.
     */
    async checkPyramidUp(wallet) {
        if (await this.hasBadge(wallet, 'pyramid_up'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT asset FROM positions WHERE wallet = $1 AND status != 'filtered'
       GROUP BY asset HAVING COUNT(*) >= 5 LIMIT 1`, [wallet]);
        if (res) {
            await this.awardBadge(wallet, 'pyramid_up');
            return { badge_name: 'pyramid_up', wallet };
        }
        return null;
    }
    /**
     * Badge: Community Builder — referred 3+ users.
     */
    async checkCommunityBuilder(wallet) {
        if (await this.hasBadge(wallet, 'community_builder'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT COUNT(*) as cnt FROM users WHERE referred_by_wallet = $1`, [wallet]);
        if (res && parseInt(res.cnt) >= 3) {
            await this.awardBadge(wallet, 'community_builder');
            return { badge_name: 'community_builder', wallet };
        }
        return null;
    }
    /**
     * Badge: Referral King — referred 10+ users.
     */
    async checkReferralKing(wallet) {
        if (await this.hasBadge(wallet, 'referral_king'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT COUNT(*) as cnt FROM users WHERE referred_by_wallet = $1`, [wallet]);
        if (res && parseInt(res.cnt) >= 10) {
            await this.awardBadge(wallet, 'referral_king');
            return { badge_name: 'referral_king', wallet };
        }
        return null;
    }
    /**
     * Badge: Legend — 50,000+ total XP.
     */
    async checkLegend(wallet) {
        if (await this.hasBadge(wallet, 'legend'))
            return null;
        const res = await (0, pool_1.queryOne)(`SELECT total_xp FROM users WHERE wallet = $1`, [wallet]);
        if (res && parseFloat(res.total_xp) >= 50000) {
            await this.awardBadge(wallet, 'legend');
            return { badge_name: 'legend', wallet };
        }
        return null;
    }
    /**
     * Badge: The OG — active trader in the first 30 days of SHIFT launch.
     * Launch date: May 26 2026. Window closes: June 25 2026.
     * Pre-launch wallets (before May 26) also qualify — they're even more OG.
     */
    async checkTheOG(wallet) {
        if (await this.hasBadge(wallet, 'the_og'))
            return null;
        const ogWindowClose = new Date('2026-06-25T23:59:59Z');
        // After window closes, only users who joined during the window qualify
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions
       WHERE wallet = $1 AND status != 'filtered'
         AND opened_at <= $2 LIMIT 1`, [wallet, ogWindowClose]);
        if (position) {
            await this.awardBadge(wallet, 'the_og');
            return { badge_name: 'the_og', wallet };
        }
        return null;
    }
    /**
     * Badge: Multi-Earnings Holder — held same position through 3+ earnings events.
     */
    async checkMultiEarningsHolder(wallet) {
        if (await this.hasBadge(wallet, 'multi_earnings_holder'))
            return null;
        const position = await (0, pool_1.queryOne)(`SELECT id FROM positions WHERE wallet = $1 AND earnings_count >= 3 LIMIT 1`, [wallet]);
        if (position) {
            await this.awardBadge(wallet, 'multi_earnings_holder');
            return { badge_name: 'multi_earnings_holder', wallet };
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
    // XP granted per badge rarity tier (flat bonus on earn)
    static BADGE_XP = {
        common: 100,
        rare: 150,
        epic: 200,
        legend: 300,
    };
    /**
     * Award a badge to a wallet, grant rarity-based XP, and queue SNAG sync.
     */
    async awardBadge(wallet, badgeName) {
        // Ensure user exists first (required for FK constraint in badges table)
        await positionService_1.positionService.ensureUserExists(wallet);
        const inserted = await (0, pool_1.execute)(`INSERT INTO badges (wallet, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [wallet, badgeName]);
        // Only award XP if this was genuinely a new badge (not a duplicate)
        if (inserted?.rowCount > 0) {
            // Look up rarity for this badge
            const def = await (0, pool_1.queryOne)(`SELECT rarity FROM badge_definitions WHERE badge_name = $1`, [badgeName]);
            const rarity = def?.rarity ?? 'common';
            const xpGrant = BadgeService.BADGE_XP[rarity] ?? 100;
            // Credit XP to the user
            await (0, pool_1.execute)(`UPDATE users SET total_xp = total_xp + $1, updated_at = NOW() WHERE wallet = $2`, [xpGrant, wallet]);
            console.log(`[Badges] 🏆 Awarded "${badgeName}" (${rarity}) to ${wallet.slice(0, 8)}... +${xpGrant} XP`);
        }
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
                const progressPct = Math.min(daysHeld / 60, 1);
                const remaining = Math.max(0, Math.ceil(60 - daysHeld));
                progress.push({
                    badge: 'diamond_hands',
                    earned: false,
                    progress: progressPct,
                    description: remaining > 0 ? `${remaining} days until Diamond Hands 💎` : 'Almost there!'
                });
            }
            else {
                progress.push({ badge: 'diamond_hands', earned: false, progress: 0, description: 'Hold a position for 60 days' });
            }
        }
        // Long-Hauler (90+ days)
        if (earnedNames.has('long_hauler')) {
            progress.push({ badge: 'long_hauler', earned: true, progress: 1, description: 'Long-Hauler achieved!' });
        }
        else {
            const oldest = await (0, pool_1.queryOne)(`SELECT opened_at FROM positions WHERE wallet = $1 AND status = 'open' ORDER BY opened_at ASC LIMIT 1`, [wallet]);
            if (oldest) {
                const daysHeld = (now.getTime() - new Date(oldest.opened_at).getTime()) / (1000 * 60 * 60 * 24);
                const progressPct = Math.min(daysHeld / 90, 1);
                const remaining = Math.max(0, Math.ceil(90 - daysHeld));
                progress.push({
                    badge: 'long_hauler',
                    earned: false,
                    progress: progressPct,
                    description: remaining > 0 ? `${remaining} days until Long-Hauler 🚀` : 'Almost there!'
                });
            }
            else {
                progress.push({ badge: 'long_hauler', earned: false, progress: 0, description: 'Hold a position for 90 days' });
            }
        }
        // The Believer (180+ days)
        if (earnedNames.has('the_believer')) {
            progress.push({ badge: 'the_believer', earned: true, progress: 1, description: 'The Believer achieved!' });
        }
        else {
            const oldest = await (0, pool_1.queryOne)(`SELECT opened_at FROM positions WHERE wallet = $1 AND status = 'open' ORDER BY opened_at ASC LIMIT 1`, [wallet]);
            if (oldest) {
                const daysHeld = (now.getTime() - new Date(oldest.opened_at).getTime()) / (1000 * 60 * 60 * 24);
                const progressPct = Math.min(daysHeld / 180, 1);
                const remaining = Math.max(0, Math.ceil(180 - daysHeld));
                progress.push({
                    badge: 'the_believer',
                    earned: false,
                    progress: progressPct,
                    description: remaining > 0 ? `${remaining} days until The Believer 👑` : 'Almost there!'
                });
            }
            else {
                progress.push({ badge: 'the_believer', earned: false, progress: 0, description: 'Hold a position for 180 days' });
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