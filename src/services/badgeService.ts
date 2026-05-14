// ============================================================
// Badge Eligibility Service — Determine who qualifies for badges
// ============================================================

import { query, queryOne, execute } from '../db/pool';
import { BadgeAward, BadgeName, Position } from '../types';
import { positionService } from './positionService';
import { eventService } from './eventService';

export class BadgeService {
  /**
   * Evaluate all badge conditions for a single wallet.
   */
  async evaluateBadges(wallet: string): Promise<BadgeAward[]> {
    const awards: BadgeAward[] = [];

    const checks = await Promise.all([
      this.checkFirstTrade(wallet),
      this.checkDiamondHands(wallet),
      this.checkEarningsReactor(wallet),
      this.checkFOMCTrader(wallet),
    ]);

    for (const award of checks) {
      if (award) awards.push(award);
    }

    return awards;
  }

  /**
   * Evaluate badges for ALL users (called by cron).
   */
  async evaluateAllUsers(): Promise<BadgeAward[]> {
    const wallets = await query<{ wallet: string }>('SELECT wallet FROM users');
    const allAwards: BadgeAward[] = [];

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
  async checkFirstTrade(wallet: string): Promise<BadgeAward | null> {
    if (await this.hasBadge(wallet, 'first_trade')) return null;

    const position = await queryOne(
      `SELECT id FROM positions WHERE wallet = $1 AND status != 'filtered' LIMIT 1`,
      [wallet]
    );

    if (position) {
      await this.awardBadge(wallet, 'first_trade');
      return { badge_name: 'first_trade', wallet };
    }
    return null;
  }

  /**
   * Badge: Diamond Hands — any position held for 30+ days.
   */
  async checkDiamondHands(wallet: string): Promise<BadgeAward | null> {
    if (await this.hasBadge(wallet, 'diamond_hands')) return null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const position = await queryOne(
      `SELECT id FROM positions 
       WHERE wallet = $1 AND status = 'open' AND opened_at <= $2 
       LIMIT 1`,
      [wallet, thirtyDaysAgo]
    );

    if (position) {
      await this.awardBadge(wallet, 'diamond_hands');
      return { badge_name: 'diamond_hands', wallet };
    }
    return null;
  }

  /**
   * Badge: Earnings Reactor — traded during an earnings event.
   */
  async checkEarningsReactor(wallet: string): Promise<BadgeAward | null> {
    if (await this.hasBadge(wallet, 'earnings_reactor')) return null;

    // Get all earnings events
    const events = await eventService.getEventsByType('earnings');

    for (const event of events) {
      // Check if user opened a position during this event on an eligible asset
      const match = await queryOne(
        `SELECT id FROM positions 
         WHERE wallet = $1 
         AND opened_at >= $2 AND opened_at <= $3 
         AND asset = ANY($4)
         AND status != 'filtered'
         LIMIT 1`,
        [wallet, event.start_time, event.end_time, event.eligible_assets]
      );

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
  async checkFOMCTrader(wallet: string): Promise<BadgeAward | null> {
    if (await this.hasBadge(wallet, 'fomc_trader')) return null;

    const events = await eventService.getEventsByType('macro');

    for (const event of events) {
      const match = await queryOne(
        `SELECT id FROM positions 
         WHERE wallet = $1 
         AND opened_at >= $2 AND opened_at <= $3 
         AND status != 'filtered'
         LIMIT 1`,
        [wallet, event.start_time, event.end_time]
      );

      if (match) {
        await this.awardBadge(wallet, 'fomc_trader');
        return { badge_name: 'fomc_trader', wallet };
      }
    }
    return null;
  }

  // ── Helpers ──

  /**
   * Check if wallet already has a specific badge.
   */
  async hasBadge(wallet: string, badgeName: BadgeName): Promise<boolean> {
    const badge = await queryOne(
      'SELECT id FROM badges WHERE wallet = $1 AND badge_name = $2',
      [wallet, badgeName]
    );
    return !!badge;
  }

  /**
   * Award a badge to a wallet (local DB only — SNAG sync is separate).
   */
  async awardBadge(wallet: string, badgeName: BadgeName): Promise<void> {
    await execute(
      `INSERT INTO badges (wallet, badge_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [wallet, badgeName]
    );
    console.log(`[Badges] 🏆 Awarded "${badgeName}" to ${wallet.slice(0, 8)}...`);
  }

  /**
   * Get all badges for a wallet.
   */
  async getBadges(wallet: string): Promise<Array<{ badge_name: string; earned_at: Date }>> {
    return query(
      'SELECT badge_name, earned_at FROM badges WHERE wallet = $1 ORDER BY earned_at',
      [wallet]
    );
  }

  /**
   * Get badge progress info for psychology hooks.
   */
  async getBadgeProgress(wallet: string): Promise<Array<{
    badge: BadgeName;
    earned: boolean;
    progress: number;
    description: string;
  }>> {
    const badges = await this.getBadges(wallet);
    const earnedNames = new Set(badges.map(b => b.badge_name));
    const now = new Date();

    const progress: Array<{
      badge: BadgeName;
      earned: boolean;
      progress: number;
      description: string;
    }> = [];

    // First Trade
    if (earnedNames.has('first_trade')) {
      progress.push({ badge: 'first_trade', earned: true, progress: 1, description: 'First trade completed!' });
    } else {
      progress.push({ badge: 'first_trade', earned: false, progress: 0, description: 'Make your first trade' });
    }

    // Diamond Hands
    if (earnedNames.has('diamond_hands')) {
      progress.push({ badge: 'diamond_hands', earned: true, progress: 1, description: 'Diamond Hands achieved!' });
    } else {
      // Find longest held open position
      const oldest = await queryOne<Position>(
        `SELECT opened_at FROM positions WHERE wallet = $1 AND status = 'open' ORDER BY opened_at ASC LIMIT 1`,
        [wallet]
      );
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
      } else {
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

    return progress;
  }
}

export const badgeService = new BadgeService();
