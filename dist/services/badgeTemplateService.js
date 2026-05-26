"use strict";
// ============================================================
// BadgeTemplateService — Template-Driven Badge Evaluation
// ============================================================
// Evaluates badge eligibility based on 31 rule templates
// Enforces +2.0x stacking cap with Hall of Fame bypass
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeTemplateService = exports.BadgeTemplateService = void 0;
const pool_1 = require("../db/pool");
const positionService_1 = require("./positionService");
class BadgeTemplateService {
    /**
     * Get all available badge templates
     */
    async getTemplates() {
        const res = await (0, pool_1.query)('SELECT * FROM badge_rule_templates WHERE duration_type IN (\'permanent\', \'dynamic\') ORDER BY category, display_name');
        return res;
    }
    /**
     * Get template by key
     */
    async getTemplate(templateKey) {
        const res = await (0, pool_1.query)('SELECT * FROM badge_rule_templates WHERE template_key = $1', [templateKey]);
        return res[0];
    }
    /**
     * Evaluate if wallet qualifies for a badge based on rule template
     * Rule templates: doubled_down, fed_day_trade, crash_buyer, etc.
     */
    async evaluateRule(wallet, templateKey, config) {
        try {
            const template = await this.getTemplate(templateKey);
            if (!template) {
                return { templateKey, earned: false, reason: 'Template not found' };
            }
            // Route to template-specific evaluator
            const evaluator = this.getEvaluator(templateKey);
            if (!evaluator) {
                return {
                    templateKey,
                    earned: false,
                    reason: `No evaluator for template: ${templateKey}`,
                };
            }
            const eligible = await evaluator.call(this, wallet, config || {});
            return {
                templateKey,
                earned: eligible,
                earnedAt: eligible ? new Date() : undefined,
            };
        }
        catch (err) {
            console.error(`[BadgeTemplateService] Error evaluating ${templateKey}:`, err);
            return { templateKey, earned: false, reason: 'Evaluation error' };
        }
    }
    /**
     * Evaluate all badges for a wallet
     */
    async evaluateAllBadges(wallet) {
        const templates = await this.getTemplates();
        const results = [];
        for (const template of templates) {
            const result = await this.evaluateRule(wallet, template.template_key, template.parameters);
            results.push(result);
        }
        return results;
    }
    /**
     * Calculate badge multiplier stacking for a wallet/position
     * Enforces +2.0x cap with Hall of Fame bypass
     */
    async calculateBadgeStacking(wallet, positionId) {
        // Get all badges earned by wallet for this position
        const sql = `
      SELECT bd.badge_name, brt.multiplier_value, brt.is_hall_of_fame
      FROM user_badges ub
      JOIN badge_definitions bd ON ub.badge_id = bd.id
      JOIN badge_rule_templates brt ON bd.rule_template = brt.template_key
      WHERE ub.wallet = $1
        AND bd.is_active = true
        ${positionId ? 'AND ub.position_id = $2' : ''}
      ORDER BY brt.multiplier_value DESC
    `;
        const params = positionId ? [wallet, positionId] : [wallet];
        const res = await (0, pool_1.query)(sql, params);
        const badges = res;
        const regularBadges = badges.filter((b) => !b.is_hall_of_fame);
        const hofBadges = badges.filter((b) => b.is_hall_of_fame);
        // Regular badges: top 3 at full value, rest at half value (cap at 2.0x)
        let totalMultiplier = 0;
        const topThreeBadges = [];
        const remainingBadges = [];
        for (let i = 0; i < regularBadges.length; i++) {
            const badge = regularBadges[i];
            if (i < 3) {
                // Top 3: full value
                totalMultiplier += badge.multiplier_value;
                topThreeBadges.push(badge.badge_name);
            }
            else {
                // Remaining: half value
                totalMultiplier += badge.multiplier_value * 0.5;
                remainingBadges.push(badge.badge_name);
            }
        }
        // Cap regular badges at 2.0x
        const cappedMultiplier = Math.min(totalMultiplier, 2.0);
        // Hall of Fame badges: bypass cap with separate +0.10x premium per badge
        let hallOfFameMultiplier = 0;
        if (hofBadges.length > 0) {
            // Sum HOF badge multipliers (they add on top of 2.0x cap)
            hallOfFameMultiplier = hofBadges.reduce((sum, b) => sum + (b.multiplier_value - 1.0), 0);
        }
        // Final multiplier = capped regular + HOF on top
        const finalMultiplier = cappedMultiplier + hallOfFameMultiplier;
        return {
            topThreeBadges,
            remainingBadges,
            totalMultiplier: cappedMultiplier,
            hallOfFameMultiplier,
            finalMultiplier,
        };
    }
    /**
     * Award badge to wallet (with optional position context)
     */
    async awardBadge(wallet, templateKey, positionId, awardedBy) {
        // Ensure user exists first (required for FK constraint in user_badges table)
        await positionService_1.positionService.ensureUserExists(wallet);
        const template = await this.getTemplate(templateKey);
        if (!template) {
            throw new Error(`Template not found: ${templateKey}`);
        }
        // Find or create badge definition for this template
        let badgeId;
        const badgeRes = await (0, pool_1.query)('SELECT id FROM badge_definitions WHERE rule_template = $1 LIMIT 1', [templateKey]);
        if (badgeRes.length > 0) {
            badgeId = badgeRes[0].id;
        }
        else {
            // Create badge definition from template
            const createRes = await (0, pool_1.query)(`INSERT INTO badge_definitions
         (badge_name, description, multiplier_value, rule_template, duration_type, dynamic_duration_days, is_hall_of_fame, is_active, created_by_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         RETURNING id`, [
                templateKey,
                template.description,
                template.multiplier_value,
                templateKey,
                template.duration_type,
                template.dynamic_duration_days,
                template.is_hall_of_fame,
                awardedBy || 'system',
            ]);
            badgeId = createRes[0].id;
        }
        // Award badge to user
        await (0, pool_1.query)(`INSERT INTO user_badges (wallet, badge_id, position_id, awarded_at, awarded_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (wallet, badge_id) DO NOTHING`, [wallet, badgeId, positionId || null, awardedBy || 'system']);
        console.log(`[BadgeTemplateService] Awarded ${templateKey} to ${wallet.slice(0, 8)}...`);
    }
    /**
     * Revoke badge from wallet
     */
    async revokeBadge(wallet, templateKey) {
        const res = await (0, pool_1.query)(`DELETE FROM user_badges
       WHERE wallet = $1
       AND badge_id = (SELECT id FROM badge_definitions WHERE rule_template = $2)`, [wallet, templateKey]);
        console.log(`[BadgeTemplateService] Revoked ${templateKey} from ${wallet.slice(0, 8)}...`);
    }
    /**
     * Get evaluator function for template
     * Maps template key to evaluation logic
     */
    getEvaluator(templateKey) {
        const evaluators = {
            // Conviction Adding
            doubled_down: this.evaluateDoubledDown.bind(this),
            triple_down: this.evaluateTripleDown.bind(this),
            pyramid_up: this.evaluatePyramidUp.bind(this),
            conviction_stack: this.evaluateConvictionStack.bind(this),
            // Buying Dip/Breakout
            dip_buyer: this.evaluateDipBuyer.bind(this),
            crash_buyer: this.evaluateCrashBuyer.bind(this),
            black_swan_buyer: this.evaluateBlackSwanBuyer.bind(this),
            momentum_rider: this.evaluateMomentumRider.bind(this),
            breakout_buyer: this.evaluateBreakoutBuyer.bind(this),
            new_high_holder: this.evaluateNewHighHolder.bind(this),
            // Event-Driven
            earnings_conviction: this.evaluateEarningsConviction.bind(this),
            geopolitical_trade: this.evaluateGeopoliticalTrade.bind(this),
            fed_day_trade: this.evaluateFedDayTrade.bind(this),
            cpi_bet: this.evaluateCpiBet.bind(this),
            news_reactor: this.evaluateNewsReactor.bind(this),
            // Short Conviction
            first_short: this.evaluateFirstShort.bind(this),
            top_caller: this.evaluateTopCaller.bind(this),
            earnings_short: this.evaluateEarningsShort.bind(this),
            squeeze_survivor: this.evaluateSqueezeSurvivor.bind(this),
            macro_bear: this.evaluateMacroBear.bind(this),
            // Drawdown/Duration
            negative_10_survivor: this.evaluateNegative10Survivor.bind(this),
            negative_20_survivor: this.evaluateNegative20Survivor.bind(this),
            iron_hands: this.evaluateIronHands.bind(this),
            diamond_hands: this.evaluateDiamondHands.bind(this),
            long_hauler: this.evaluateLongHauler.bind(this),
            the_believer: this.evaluateTheBeliever.bind(this),
            multi_earnings_holder: this.evaluateMultiEarningsHolder.bind(this),
            // Volume & OG
            volume_veteran_i: this.evaluateVolumeVeteranI.bind(this),
            volume_veteran_ii: this.evaluateVolumeVeteranII.bind(this),
            volume_veteran_iii: this.evaluateVolumeVeteranIII.bind(this),
            the_og: this.evaluateTheOg.bind(this),
        };
        return evaluators[templateKey] || null;
    }
    // ── Evaluator Implementations ──────────────────────────────────────
    // Each method checks if wallet meets specific badge criteria
    async evaluateDoubledDown(wallet, config) {
        // Added to position after -5% drop from entry
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND entry_price IS NOT NULL
       AND (SELECT COUNT(*) FROM position_trades WHERE position_id = positions.id AND action = 'add'
            AND entry_price_at_trade <= entry_price * 0.95) > 0`, [wallet]);
        return res[0].count > 0;
    }
    async evaluateTripleDown(wallet, config) {
        // Added 3+ times during -10% drawdown
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND (SELECT COUNT(*) FROM position_trades WHERE position_id = positions.id AND action = 'add') >= 3`, [wallet]);
        return res[0].count > 0;
    }
    async evaluatePyramidUp(wallet, config) {
        // Added 3+ times as position rose +10%
        return true; // Placeholder
    }
    async evaluateConvictionStack(wallet, config) {
        // 5+ separate adds over 30+ days
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND (SELECT COUNT(*) FROM position_trades WHERE position_id = positions.id AND action = 'add') >= 5
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 30`, [wallet]);
        return res[0].count > 0;
    }
    async evaluateDipBuyer(wallet, config) {
        // Opened long on day underlying closed -3%+
        return true; // Placeholder
    }
    async evaluateCrashBuyer(wallet, config) {
        // Opened long on day SPX closed -5%+
        return true; // Placeholder
    }
    async evaluateBlackSwanBuyer(wallet, config) {
        // Opened long on day SPX closed -10%+
        return true; // Placeholder
    }
    async evaluateMomentumRider(wallet, config) {
        // Opened long on day underlying closed +3%+
        return true; // Placeholder
    }
    async evaluateBreakoutBuyer(wallet, config) {
        // Opened within 24h of 52-week high
        return true; // Placeholder
    }
    async evaluateNewHighHolder(wallet, config) {
        // Opened at all-time high, held 30+ days
        return true; // Placeholder
    }
    async evaluateEarningsConviction(wallet, config) {
        // Opened 24h before earnings, held through report
        return true; // Placeholder
    }
    async evaluateGeopoliticalTrade(wallet, config) {
        // Opened during major geopolitical event
        return true; // Placeholder
    }
    async evaluateFedDayTrade(wallet, config) {
        // Opened on FOMC announcement day
        return true; // Placeholder
    }
    async evaluateCpiBet(wallet, config) {
        // Opened on CPI release day
        return true; // Placeholder
    }
    async evaluateNewsReactor(wallet, config) {
        // Opened within 60m of market-moving headline
        return true; // Placeholder
    }
    async evaluateFirstShort(wallet, config) {
        // First short position opened
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1 AND side = 'short'`, [wallet]);
        return res[0].count > 0;
    }
    async evaluateTopCaller(wallet, config) {
        // Shorted within 24h of 52-week high
        return true; // Placeholder
    }
    async evaluateEarningsShort(wallet, config) {
        // Shorted into earnings, closed profitable
        return true; // Placeholder
    }
    async evaluateSqueezeSurvivor(wallet, config) {
        // Held short through +10% squeeze, closed profitable
        return true; // Placeholder
    }
    async evaluateMacroBear(wallet, config) {
        // Held short 30+ days
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND side = 'short'
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 30`, [wallet]);
        return res[0].count > 0;
    }
    async evaluateNegative10Survivor(wallet, config) {
        // Held through -10% drawdown without closing
        return true; // Placeholder
    }
    async evaluateNegative20Survivor(wallet, config) {
        // Held through -20% drawdown without closing
        return true; // Placeholder
    }
    async evaluateIronHands(wallet, config) {
        // Held through -30%+ drawdown and closed profitable
        return true; // Placeholder
    }
    async evaluateDiamondHands(wallet, config) {
        // Held single position 60+ days
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 60`, [wallet]);
        return res[0].count > 0;
    }
    async evaluateLongHauler(wallet, config) {
        // Held single position 90+ days
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 90`, [wallet]);
        return res[0].count > 0;
    }
    async evaluateTheBeliever(wallet, config) {
        // Held single position 180+ days
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 180`, [wallet]);
        return res[0].count > 0;
    }
    async evaluateMultiEarningsHolder(wallet, config) {
        // Held same position through 2+ earnings
        return true; // Placeholder
    }
    async evaluateVolumeVeteranI(wallet, config) {
        // Cumulative volume ≥ $10,000
        const res = await (0, pool_1.query)(`SELECT COALESCE(SUM(amount), 0) as total_volume FROM positions
       WHERE wallet = $1`, [wallet]);
        return res[0].total_volume >= 10000;
    }
    async evaluateVolumeVeteranII(wallet, config) {
        // Cumulative volume ≥ $100,000
        const res = await (0, pool_1.query)(`SELECT COALESCE(SUM(amount), 0) as total_volume FROM positions
       WHERE wallet = $1`, [wallet]);
        return res[0].total_volume >= 100000;
    }
    async evaluateVolumeVeteranIII(wallet, config) {
        // Cumulative volume ≥ $1,000,000
        const res = await (0, pool_1.query)(`SELECT COALESCE(SUM(amount), 0) as total_volume FROM positions
       WHERE wallet = $1`, [wallet]);
        return res[0].total_volume >= 1000000;
    }
    async evaluateTheOg(wallet, config) {
        // Active in first 30 days of launch
        const launchDate = new Date(process.env.NEXT_PUBLIC_LAUNCH_START_DATE || '2026-05-26');
        const thirtyDaysLater = new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const res = await (0, pool_1.query)(`SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1 AND opened_at <= $2`, [wallet, thirtyDaysLater]);
        return res[0].count > 0;
    }
}
exports.BadgeTemplateService = BadgeTemplateService;
// Export singleton instance
exports.badgeTemplateService = new BadgeTemplateService();
//# sourceMappingURL=badgeTemplateService.js.map