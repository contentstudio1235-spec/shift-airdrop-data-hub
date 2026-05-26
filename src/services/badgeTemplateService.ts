// ============================================================
// BadgeTemplateService — Template-Driven Badge Evaluation
// ============================================================
// Evaluates badge eligibility based on 31 rule templates
// Enforces +2.0x stacking cap with Hall of Fame bypass

import { execute, query, queryOne } from '../db/pool';

interface RuleConfig {
  [key: string]: number | string | boolean | string[];
}

interface BadgeEligibility {
  templateKey: string;
  earned: boolean;
  reason?: string;
  earnedAt?: Date;
}

interface StackingResult {
  topThreeBadges: string[]; // Full multiplier
  remainingBadges: string[]; // Half multiplier
  totalMultiplier: number;
  hallOfFameMultiplier: number;
  finalMultiplier: number; // Capped at 2.0x
}

export class BadgeTemplateService {
  /**
   * Get all available badge templates
   */
  async getTemplates(): Promise<any[]> {
    const res = await query(
      'SELECT * FROM badge_rule_templates WHERE duration_type IN (\'permanent\', \'dynamic\') ORDER BY category, display_name'
    );
    return res;
  }

  /**
   * Get template by key
   */
  async getTemplate(templateKey: string): Promise<any> {
    const res = await query(
      'SELECT * FROM badge_rule_templates WHERE template_key = $1',
      [templateKey]
    );
    return res[0];
  }

  /**
   * Evaluate if wallet qualifies for a badge based on rule template
   * Rule templates: doubled_down, fed_day_trade, crash_buyer, etc.
   */
  async evaluateRule(
    wallet: string,
    templateKey: string,
    config?: RuleConfig
  ): Promise<BadgeEligibility> {
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
    } catch (err) {
      console.error(
        `[BadgeTemplateService] Error evaluating ${templateKey}:`,
        err
      );
      return { templateKey, earned: false, reason: 'Evaluation error' };
    }
  }

  /**
   * Evaluate all badges for a wallet
   */
  async evaluateAllBadges(wallet: string): Promise<BadgeEligibility[]> {
    const templates = await this.getTemplates();
    const results: BadgeEligibility[] = [];

    for (const template of templates) {
      const result = await this.evaluateRule(
        wallet,
        template.template_key,
        template.parameters
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate badge multiplier stacking for a wallet/position
   * Enforces +2.0x cap with Hall of Fame bypass
   */
  async calculateBadgeStacking(
    wallet: string,
    positionId?: string
  ): Promise<StackingResult> {
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
    const res = await query(sql, params);

    const badges = res;
    const regularBadges = badges.filter((b) => !b.is_hall_of_fame);
    const hofBadges = badges.filter((b) => b.is_hall_of_fame);

    // Regular badges: top 3 at full value, rest at half value (cap at 2.0x)
    let totalMultiplier = 0;
    const topThreeBadges: string[] = [];
    const remainingBadges: string[] = [];

    for (let i = 0; i < regularBadges.length; i++) {
      const badge = regularBadges[i];
      if (i < 3) {
        // Top 3: full value
        totalMultiplier += badge.multiplier_value;
        topThreeBadges.push(badge.badge_name);
      } else {
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
      hallOfFameMultiplier = hofBadges.reduce(
        (sum, b) => sum + (b.multiplier_value - 1.0),
        0
      );
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
  async awardBadge(
    wallet: string,
    templateKey: string,
    positionId?: string,
    awardedBy?: string
  ): Promise<void> {
    const template = await this.getTemplate(templateKey);
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    // Find or create badge definition for this template
    let badgeId: string;
    const badgeRes = await query(
      'SELECT id FROM badge_definitions WHERE rule_template = $1 LIMIT 1',
      [templateKey]
    );

    if (badgeRes.length > 0) {
      badgeId = badgeRes[0].id;
    } else {
      // Create badge definition from template
      const createRes = await query(
        `INSERT INTO badge_definitions
         (badge_name, description, multiplier_value, rule_template, duration_type, dynamic_duration_days, is_hall_of_fame, is_active, created_by_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         RETURNING id`,
        [
          templateKey,
          template.description,
          template.multiplier_value,
          templateKey,
          template.duration_type,
          template.dynamic_duration_days,
          template.is_hall_of_fame,
          awardedBy || 'system',
        ]
      );
      badgeId = createRes[0].id;
    }

    // Award badge to user
    await query(
      `INSERT INTO user_badges (wallet, badge_id, position_id, awarded_at, awarded_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (wallet, badge_id) DO NOTHING`,
      [wallet, badgeId, positionId || null, awardedBy || 'system']
    );

    console.log(
      `[BadgeTemplateService] Awarded ${templateKey} to ${wallet.slice(0, 8)}...`
    );
  }

  /**
   * Revoke badge from wallet
   */
  async revokeBadge(wallet: string, templateKey: string): Promise<void> {
    const res = await query(
      `DELETE FROM user_badges
       WHERE wallet = $1
       AND badge_id = (SELECT id FROM badge_definitions WHERE rule_template = $2)`,
      [wallet, templateKey]
    );

    console.log(
      `[BadgeTemplateService] Revoked ${templateKey} from ${wallet.slice(0, 8)}...`
    );
  }

  /**
   * Get evaluator function for template
   * Maps template key to evaluation logic
   */
  private getEvaluator(
    templateKey: string
  ): ((wallet: string, config: RuleConfig) => Promise<boolean>) | null {
    const evaluators: {
      [key: string]: (wallet: string, config: RuleConfig) => Promise<boolean>;
    } = {
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
      multi_earnings_holder:
        this.evaluateMultiEarningsHolder.bind(this),

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

  private async evaluateDoubledDown(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Added to position after -5% drop from entry
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND entry_price IS NOT NULL
       AND (SELECT COUNT(*) FROM position_trades WHERE position_id = positions.id AND action = 'add'
            AND entry_price_at_trade <= entry_price * 0.95) > 0`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluateTripleDown(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Added 3+ times during -10% drawdown
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND (SELECT COUNT(*) FROM position_trades WHERE position_id = positions.id AND action = 'add') >= 3`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluatePyramidUp(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Added 3+ times as position rose +10%
    return true; // Placeholder
  }

  private async evaluateConvictionStack(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // 5+ separate adds over 30+ days
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND (SELECT COUNT(*) FROM position_trades WHERE position_id = positions.id AND action = 'add') >= 5
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 30`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluateDipBuyer(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened long on day underlying closed -3%+
    return true; // Placeholder
  }

  private async evaluateCrashBuyer(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened long on day SPX closed -5%+
    return true; // Placeholder
  }

  private async evaluateBlackSwanBuyer(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened long on day SPX closed -10%+
    return true; // Placeholder
  }

  private async evaluateMomentumRider(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened long on day underlying closed +3%+
    return true; // Placeholder
  }

  private async evaluateBreakoutBuyer(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened within 24h of 52-week high
    return true; // Placeholder
  }

  private async evaluateNewHighHolder(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened at all-time high, held 30+ days
    return true; // Placeholder
  }

  private async evaluateEarningsConviction(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened 24h before earnings, held through report
    return true; // Placeholder
  }

  private async evaluateGeopoliticalTrade(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened during major geopolitical event
    return true; // Placeholder
  }

  private async evaluateFedDayTrade(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened on FOMC announcement day
    return true; // Placeholder
  }

  private async evaluateCpiBet(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened on CPI release day
    return true; // Placeholder
  }

  private async evaluateNewsReactor(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Opened within 60m of market-moving headline
    return true; // Placeholder
  }

  private async evaluateFirstShort(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // First short position opened
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1 AND side = 'short'`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluateTopCaller(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Shorted within 24h of 52-week high
    return true; // Placeholder
  }

  private async evaluateEarningsShort(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Shorted into earnings, closed profitable
    return true; // Placeholder
  }

  private async evaluateSqueezeSurvivor(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held short through +10% squeeze, closed profitable
    return true; // Placeholder
  }

  private async evaluateMacroBear(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held short 30+ days
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND side = 'short'
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 30`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluateNegative10Survivor(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held through -10% drawdown without closing
    return true; // Placeholder
  }

  private async evaluateNegative20Survivor(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held through -20% drawdown without closing
    return true; // Placeholder
  }

  private async evaluateIronHands(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held through -30%+ drawdown and closed profitable
    return true; // Placeholder
  }

  private async evaluateDiamondHands(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held single position 60+ days
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 60`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluateLongHauler(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held single position 90+ days
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 90`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluateTheBeliever(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held single position 180+ days
    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1
       AND EXTRACT(DAY FROM (closed_at - opened_at)) >= 180`,
      [wallet]
    );
    return res[0].count > 0;
  }

  private async evaluateMultiEarningsHolder(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Held same position through 2+ earnings
    return true; // Placeholder
  }

  private async evaluateVolumeVeteranI(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Cumulative volume ≥ $10,000
    const res = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_volume FROM positions
       WHERE wallet = $1`,
      [wallet]
    );
    return res[0].total_volume >= 10000;
  }

  private async evaluateVolumeVeteranII(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Cumulative volume ≥ $100,000
    const res = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_volume FROM positions
       WHERE wallet = $1`,
      [wallet]
    );
    return res[0].total_volume >= 100000;
  }

  private async evaluateVolumeVeteranIII(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Cumulative volume ≥ $1,000,000
    const res = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_volume FROM positions
       WHERE wallet = $1`,
      [wallet]
    );
    return res[0].total_volume >= 1000000;
  }

  private async evaluateTheOg(
    wallet: string,
    config: RuleConfig
  ): Promise<boolean> {
    // Active in first 30 days of launch
    const launchDate = new Date(process.env.NEXT_PUBLIC_LAUNCH_START_DATE || '2026-05-26');
    const thirtyDaysLater = new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const res = await query(
      `SELECT COUNT(*) as count FROM positions
       WHERE wallet = $1 AND opened_at <= $2`,
      [wallet, thirtyDaysLater]
    );
    return res[0].count > 0;
  }
}

// Export singleton instance
export const badgeTemplateService = new BadgeTemplateService();
