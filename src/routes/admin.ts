// ============================================================
// Admin Routes — Sync triggers, KOL management
// ============================================================

import express from 'express';
import axios from 'axios';
import { config } from '../config';
import { snagSyncService } from '../services/snagSyncService';
import { referralService } from '../services/referralService';
import { holdingService } from '../services/holdingService';
import { positionService } from '../services/positionService';
import { jupiterPriceService } from '../services/jupiterPriceService';
import { launchConfigService } from '../services/launchConfigService';
import { adminAuditService } from '../services/adminAuditService';
import { badgeTemplateService } from '../services/badgeTemplateService';
import { TRACKED_TOKENS } from '../config/tokens';
import { pool } from '../db/pool';
import { eventService } from '../services/eventService';
import { configService } from '../services/configService';
import { certificateService } from '../services/certificateService';

interface TokenBalance {
  symbol: string;
  mint: string;
  onChainBalance: number;
}

const router = express.Router();

/**
 * Middleware: Verify admin passcode header
 * Protects the admin endpoints from unauthorized access
 * Uses hardcoded passcode for KOL management
 */
const ADMIN_PASSCODE = 'ShiftRwa2026@@$$Key';

/**
 * Helper: Convert string | string[] to string
 */
const asString = (value: any): string => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const verifyAdminSecret = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const passcode = req.headers['x-admin-key'] as string | undefined;

  if (!passcode || passcode !== ADMIN_PASSCODE) {
    console.warn('[Admin] Invalid admin passcode');
    return res.status(401).json({ error: 'Unauthorized - Invalid passcode' });
  }

  next();
};

/**
 * POST /api/admin/sync
 * Trigger a full XP recalculation + badge evaluation + SNAG sync
 * Called by SNAG Stratus scheduled function every 10 minutes
 */
router.post('/sync', verifyAdminSecret, async (req, res) => {
  try {
    console.log('[Admin] Manual full sync triggered');
    const startTime = Date.now();

    await snagSyncService.fullSync();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Admin] Full sync completed in ${duration}s`);

    res.json({
      success: true,
      message: 'Full sync completed',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/queue-retry
 * Manually trigger SNAG sync queue retry worker
 */
router.post('/queue-retry', verifyAdminSecret, async (req, res) => {
  try {
    console.log('[Admin] Manual queue retry triggered');
    const startTime = Date.now();

    await snagSyncService.processRetryQueue();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Admin] Queue retry completed in ${duration}s`);

    res.json({
      success: true,
      message: 'Queue retry completed',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Queue retry failed:', error);
    res.status(500).json({
      success: false,
      error: 'Queue retry failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/health
 * Check admin endpoint is working
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ── KOL Management ───────────────────────────────────────────────────────

/**
 * GET /api/admin/kol
 * List all KOL entries with referral counts
 */
router.get('/kol', verifyAdminSecret, async (_req, res) => {
  try {
    const kols = await referralService.listKols();
    res.json({ kols, total: kols.length });
  } catch (error) {
    console.error('[Admin] Failed to list KOLs:', error);
    res.status(500).json({ error: 'Failed to list KOLs' });
  }
});

/**
 * POST /api/admin/kol
 * Add or update a KOL whitelist entry
 * Body: { wallet, customCode, displayName?, multiplierBonus?, multiplierType?, notes? }
 */
router.post('/kol', verifyAdminSecret, async (req, res) => {
  try {
    const {
      wallet,
      customCode,
      displayName,
      multiplierBonus,
      multiplierType,
      notes,
    } = req.body;

    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    if (!customCode || customCode.length < 4) {
      return res.status(400).json({ error: 'Custom code must be at least 4 characters' });
    }
    if (!/^[A-Z0-9-]{4,32}$/i.test(customCode)) {
      return res.status(400).json({ error: 'Code must be alphanumeric with hyphens only (4–32 chars)' });
    }
    if (multiplierBonus !== undefined && (multiplierBonus < 1.0 || multiplierBonus > 2.0)) {
      return res.status(400).json({ error: 'Multiplier bonus must be between 1.0 and 2.0' });
    }
    if (multiplierType !== undefined && !['dynamic', 'permanent'].includes(multiplierType)) {
      return res.status(400).json({ error: 'multiplierType must be "dynamic" or "permanent"' });
    }

    const kol = await referralService.addKol({
      wallet,
      customCode,
      displayName,
      multiplierBonus: multiplierBonus ?? 1.5,
      multiplierType: multiplierType ?? 'dynamic',
      notes,
      createdBy: 'admin',
    });

    res.json({ success: true, kol });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Custom code already in use' });
    }
    console.error('[Admin] Failed to add KOL:', error);
    res.status(500).json({ error: 'Failed to add KOL' });
  }
});

/**
 * PATCH /api/admin/kol/:wallet
 * Update a KOL entry (activate/deactivate, change multiplier, etc.)
 */
router.patch('/kol/:wallet', verifyAdminSecret, async (req, res) => {
  try {
    const { wallet } = req.params as { wallet: string };
    const { customCode, displayName, multiplierBonus, multiplierType, isActive, notes } = req.body as any;

    if (multiplierBonus !== undefined && (multiplierBonus < 1.0 || multiplierBonus > 2.0)) {
      return res.status(400).json({ error: 'Multiplier bonus must be between 1.0 and 2.0' });
    }

    const updates: any = {};
    if (customCode !== undefined) updates.customCode = customCode;
    if (displayName !== undefined) updates.displayName = displayName;
    if (multiplierBonus !== undefined) updates.multiplierBonus = multiplierBonus;
    if (multiplierType !== undefined) updates.multiplierType = multiplierType;
    if (isActive !== undefined) updates.isActive = isActive;
    if (notes !== undefined) updates.notes = notes;

    const updated = await referralService.updateKol(wallet, updates);

    if (!updated) {
      return res.status(404).json({ error: 'KOL not found' });
    }

    res.json({ success: true, kol: updated });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Custom code already in use' });
    }
    console.error('[Admin] Failed to update KOL:', error);
    res.status(500).json({ error: 'Failed to update KOL' });
  }
});

/**
 * DELETE /api/admin/kol/:wallet
 * Deactivate (soft delete) a KOL
 */
router.delete('/kol/:wallet', verifyAdminSecret, async (req, res) => {
  try {
    const { wallet } = req.params as { wallet: string };
    const updated = await referralService.updateKol(wallet, { isActive: false });
    if (!updated) return res.status(404).json({ error: 'KOL not found' });
    res.json({ success: true, message: 'KOL deactivated' });
  } catch (error) {
    console.error('[Admin] Failed to deactivate KOL:', error);
    res.status(500).json({ error: 'Failed to deactivate KOL' });
  }
});

/**
 * GET /api/admin/kol/:wallet/referrals
 * Get all referrals through a KOL's custom code with detailed analytics
 */
router.get('/kol/:wallet/referrals', verifyAdminSecret, async (req, res) => {
  try {
    const wallet = asString(req.params.wallet);
    const { limit = 100, offset = 0 } = req.query;

    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Get KOL info
    const kolResult = await pool.query(
      `SELECT wallet, custom_code, display_name, multiplier_bonus, multiplier_type, is_active
       FROM kol_whitelist WHERE wallet = $1`,
      [wallet]
    );

    if (kolResult.rows.length === 0) {
      return res.status(404).json({ error: 'KOL not found' });
    }

    const kol = kolResult.rows[0];

    // Get all referrals through this KOL's code
    const referralsResult = await pool.query(
      `SELECT
         r.id, r.referred_wallet, r.code_used, r.bonus_multiplier, r.bonus_type,
         r.bonus_applied, r.referred_at, u.total_xp, u.permanent_multiplier, u.dynamic_multiplier
       FROM referrals r
       LEFT JOIN users u ON r.referred_wallet = u.wallet
       WHERE r.referrer_wallet = $1
       ORDER BY r.referred_at DESC
       LIMIT $2 OFFSET $3`,
      [wallet, parseInt(limit as string) || 100, parseInt(offset as string) || 0]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) as count FROM referrals WHERE referrer_wallet = $1`,
      [wallet]
    );

    const totalReferrals = parseInt(totalResult.rows[0]?.count) || 0;
    const appliedCount = referralsResult.rows.filter((r: any) => r.bonus_applied).length;

    res.json({
      success: true,
      kol: {
        wallet: kol.wallet,
        customCode: kol.custom_code,
        displayName: kol.display_name,
        multiplierBonus: parseFloat(kol.multiplier_bonus),
        multiplierType: kol.multiplier_type,
        isActive: kol.is_active,
      },
      stats: {
        totalReferrals,
        bonusApplied: appliedCount,
        pendingBonus: totalReferrals - appliedCount,
      },
      referrals: referralsResult.rows.map((r: any) => ({
        id: r.id,
        refereeWallet: r.referred_wallet,
        refereeXp: parseFloat(r.total_xp) || 0,
        codeUsed: r.code_used,
        bonusMultiplier: parseFloat(r.bonus_multiplier),
        bonusType: r.bonus_type,
        bonusApplied: r.bonus_applied,
        referredAt: r.referred_at,
      })),
      pagination: {
        limit: parseInt(limit as string) || 100,
        offset: parseInt(offset as string) || 0,
        total: totalReferrals,
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch KOL referrals:', error);
    res.status(500).json({ error: 'Failed to fetch KOL referrals' });
  }
});

/**
 * GET /api/admin/referrals/config
 * Get current referral configuration (invite bonuses, multiplier ranges, etc.)
 */
router.get('/referrals/config', verifyAdminSecret, async (req, res) => {
  try {
    const configResult = await pool.query(
      `SELECT standard_bonus_xp, kol_bonus_xp FROM referral_config WHERE id = 1`
    );

    const config = configResult.rows[0] || { standard_bonus_xp: 250, kol_bonus_xp: 500 };

    res.json({
      success: true,
      config: {
        standardInviteXp: parseFloat(config.standard_bonus_xp),
        kolInviteXp: parseFloat(config.kol_bonus_xp),
        multiplierRange: { min: 1.0, max: 2.0 },
        multiplierTypes: ['dynamic', 'permanent'],
        referralRequirements: {
          description: 'Referral is counted when:',
          items: [
            'User registers with a valid referral code',
            'Code is either a KOL code or standard wallet code (first 6 chars)',
            'Referrer wallet is different from referred wallet',
            'User hasn\'t been referred before (one referrer per user)',
            'Registration is completed successfully'
          ]
        },
        dynamicMultiplier: {
          description: 'Forward-only bonus - applies only to XP earned AFTER registration',
          example: 'User registers with 1.5x dynamic bonus, earns XP going forward at 1.5x rate'
        },
        permanentMultiplier: {
          description: 'Retroactive bonus - applies to ALL XP (past and future)',
          example: 'User registers with 2.0x permanent bonus, gets 100% bonus on all XP earned'
        },
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch referral config:', error);
    res.status(500).json({ error: 'Failed to fetch referral config' });
  }
});

/**
 * PATCH /api/admin/referrals/config
 * Update referral configuration (invite bonuses)
 * Body: { standardInviteXp?, kolInviteXp?, reason? }
 */
router.patch('/referrals/config', verifyAdminSecret, async (req, res) => {
  try {
    const { standardInviteXp, kolInviteXp, reason } = req.body;
    const adminWallet = asString(req.body.adminWallet) || 'admin-system';

    if (standardInviteXp !== undefined && standardInviteXp <= 0) {
      return res.status(400).json({ error: 'standardInviteXp must be > 0' });
    }
    if (kolInviteXp !== undefined && kolInviteXp <= 0) {
      return res.status(400).json({ error: 'kolInviteXp must be > 0' });
    }

    if (standardInviteXp !== undefined) {
      await pool.query(
        `UPDATE referral_config SET standard_bonus_xp = $1, updated_at = NOW() WHERE id = 1`,
        [standardInviteXp]
      );
    }

    if (kolInviteXp !== undefined) {
      await pool.query(
        `UPDATE referral_config SET kol_bonus_xp = $1, updated_at = NOW() WHERE id = 1`,
        [kolInviteXp]
      );
    }

    // Log audit trail
    await adminAuditService.log(
      adminWallet,
      'referral_config_updated',
      'referral_config',
      'global',
      null,
      { standardInviteXp, kolInviteXp },
      reason || 'Updated referral configuration'
    );

    res.json({
      success: true,
      message: 'Referral configuration updated',
      updates: { standardInviteXp, kolInviteXp },
    });
  } catch (error) {
    console.error('[Admin] Failed to update referral config:', error);
    res.status(500).json({ error: 'Failed to update referral configuration' });
  }
});

/**
 * GET /api/admin/referrals/leaderboard
 * Get KOL performance leaderboard with referral stats
 */
router.get('/referrals/leaderboard', verifyAdminSecret, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         k.wallet, k.custom_code, k.display_name, k.multiplier_bonus, k.multiplier_type,
         COUNT(r.id) as total_referrals,
         SUM(CASE WHEN r.bonus_applied = true THEN 1 ELSE 0 END) as applied_referrals,
         SUM(CASE WHEN r.bonus_applied = false THEN 1 ELSE 0 END) as pending_referrals,
         SUM(u.total_xp) as referee_total_xp
       FROM kol_whitelist k
       LEFT JOIN referrals r ON k.wallet = r.referrer_wallet
       LEFT JOIN users u ON r.referred_wallet = u.wallet
       WHERE k.is_active = true
       GROUP BY k.wallet, k.custom_code, k.display_name, k.multiplier_bonus, k.multiplier_type
       ORDER BY total_referrals DESC`
    );

    res.json({
      success: true,
      leaderboard: result.rows.map((row: any) => ({
        wallet: row.wallet,
        customCode: row.custom_code,
        displayName: row.display_name,
        multiplierBonus: parseFloat(row.multiplier_bonus),
        multiplierType: row.multiplier_type,
        stats: {
          totalReferrals: parseInt(row.total_referrals) || 0,
          appliedReferrals: parseInt(row.applied_referrals) || 0,
          pendingReferrals: parseInt(row.pending_referrals) || 0,
          refereeAggregateXp: parseFloat(row.referee_total_xp) || 0,
        },
      })),
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch referrals leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── Wallet Backfill ───────────────────────────────────────────────────────

/**
 * POST /api/admin/backfill-wallet
 * Scan on-chain SHIFT token balances for a wallet and create any missing positions.
 * Use this for wallets that bought tokens before the Helius webhook was live,
 * or whose transactions were missed by the webhook.
 *
 * Body: { wallet: string }
 * Returns a summary of positions created / already existing.
 */
router.post('/backfill-wallet', verifyAdminSecret, async (req, res) => {
  const { wallet } = req.body as { wallet?: string };

  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  try {
    // 1. Ensure the user is registered
    await positionService.ensureUserExists(wallet);

    const results: Array<{
      token: string;
      mint: string;
      balance: number;
      usdValue: number;
      action: 'created' | 'already_open' | 'skipped_zero';
    }> = [];

    // 2. For every tracked SHIFT token, check on-chain balance
    for (const token of Object.values(TRACKED_TOKENS)) {
      const balance = await holdingService.getTokenBalance(wallet, token.mint);

      if (balance <= 0) {
        results.push({ token: token.symbol, mint: token.mint, balance: 0, usdValue: 0, action: 'skipped_zero' });
        continue;
      }

      // Check if an open position already exists
      const existingPositions = await pool.query(
        `SELECT id FROM positions WHERE wallet = $1 AND asset = $2 AND status = 'open' LIMIT 1`,
        [wallet, token.symbol]
      );

      if (existingPositions.rows.length > 0) {
        results.push({ token: token.symbol, mint: token.mint, balance, usdValue: 0, action: 'already_open' });
        continue;
      }

      // Get current USD value
      const priceData = await jupiterPriceService.calculateUSDValue(token.mint, balance);
      const usdValue = priceData?.usdValue ?? 0;
      const price = priceData?.price ?? null;

      // Create a backdated position with a synthetic signature
      const syntheticSig = `backfill_${wallet.slice(0, 8)}_${token.symbol}_${Date.now()}`;
      await positionService.openPosition(
        wallet,
        token.symbol,
        token.mint,
        usdValue,
        balance,
        price,
        syntheticSig,
        new Date()
      );

      results.push({ token: token.symbol, mint: token.mint, balance, usdValue, action: 'created' });
      console.log(`[Admin] Backfilled position: ${wallet.slice(0, 8)}... | ${token.symbol} | ${balance} tokens | $${usdValue.toFixed(2)}`);
    }

    const created = results.filter(r => r.action === 'created').length;
    const alreadyOpen = results.filter(r => r.action === 'already_open').length;

    res.json({
      success: true,
      wallet,
      summary: { created, alreadyOpen, skippedZeroBalance: results.filter(r => r.action === 'skipped_zero').length },
      positions: results,
    });
  } catch (error) {
    console.error('[Admin] Backfill wallet failed:', error);
    res.status(500).json({ error: 'Backfill failed', message: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * POST /api/admin/manual-position
 * Manually create a position for a wallet — for cases where the purchase amount/price
 * is already known and you want to set it precisely.
 *
 * Body: { wallet, asset, mint, tokenAmount, usdValue, openedAt? }
 */
router.post('/manual-position', verifyAdminSecret, async (req, res) => {
  const { wallet, asset, mint, tokenAmount, usdValue, openedAt } = req.body as {
    wallet?: string;
    asset?: string;
    mint?: string;
    tokenAmount?: number;
    usdValue?: number;
    openedAt?: string;
  };

  if (!wallet || wallet.length < 32) return res.status(400).json({ error: 'Invalid wallet' });
  if (!asset) return res.status(400).json({ error: 'asset (token symbol) required' });
  if (!usdValue || usdValue <= 0) return res.status(400).json({ error: 'usdValue must be > 0' });

  try {
    await positionService.ensureUserExists(wallet);

    const syntheticSig = `manual_${wallet.slice(0, 8)}_${asset}_${Date.now()}`;
    const timestamp = openedAt ? new Date(openedAt) : new Date();
    const pricePerToken = tokenAmount && tokenAmount > 0 ? usdValue / tokenAmount : null;

    await positionService.openPosition(
      wallet, asset, mint ?? null, usdValue, tokenAmount ?? null,
      pricePerToken, syntheticSig, timestamp
    );

    console.log(`[Admin] Manual position created: ${wallet.slice(0, 8)}... | ${asset} | $${usdValue}`);
    res.json({ success: true, wallet, asset, usdValue, openedAt: timestamp.toISOString() });
  } catch (error) {
    console.error('[Admin] Manual position failed:', error);
    res.status(500).json({ error: 'Failed to create position', message: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * GET /api/admin/wallet-status/:wallet
 * Quick diagnostic view: is wallet registered, how many positions, total XP.
 */
router.get('/wallet-status/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = asString(req.params.wallet);

  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  try {
    const [userResult, positionsResult] = await Promise.all([
      pool.query('SELECT wallet, total_xp, claim_multiplier, created_at FROM users WHERE wallet = $1', [wallet]),
      pool.query(`SELECT asset, status, position_size_usd, opened_at FROM positions WHERE wallet = $1 ORDER BY opened_at DESC LIMIT 20`, [wallet]),
    ]);

    // Check live on-chain balances for SHIFT tokens (simplified)
    const balances: TokenBalance[] = [];

    const user = userResult.rows[0] || null;
    const nonZeroBalances = balances.filter(b => b.onChainBalance > 0);

    res.json({
      wallet,
      registered: !!user,
      user: user ?? null,
      dbPositions: positionsResult.rows,
      onChainBalances: balances,
      needsBackfill: nonZeroBalances.some(b => {
        const hasOpenPos = positionsResult.rows.some(
          (p: any) => p.asset === b.symbol && p.status === 'open'
        );
        return !hasOpenPos;
      }),
    });
  } catch (error) {
    console.error('[Admin] Wallet status check failed:', error);
    res.status(500).json({ error: 'Failed to check wallet status' });
  }
});

// ── Launch Configuration ─────────────────────────────────────────────────────

/**
 * GET /api/admin/launch-config
 * Get current launch configuration and phase
 * Public endpoint (no auth needed) — returns current phase info for frontend
 */
router.get('/launch-config', async (_req, res) => {
  try {
    const config = await launchConfigService.getConfig();
    const phase = await launchConfigService.getCurrentPhase();

    res.json({
      success: true,
      phase,
      config: {
        phase1: {
          start: config?.phase1_start_time,
          end: config?.phase1_end_time,
          multiplier: config?.phase1_multiplier,
          label: config?.phase1_label,
        },
        phase2: {
          start: config?.phase2_start_time,
          end: config?.phase2_end_time,
          multiplier: config?.phase2_multiplier,
          label: config?.phase2_label,
        },
        phase3: {
          start: config?.phase3_start_time,
          end: config?.phase3_end_time,
          multiplier: config?.phase3_multiplier,
          label: config?.phase3_label,
        },
        is_active: config?.is_active,
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch launch config:', error);
    res.status(500).json({ error: 'Failed to fetch launch config' });
  }
});

/**
 * PATCH /api/admin/launch-config/phase/:phase
 * Update a specific phase (admin only)
 * Body: { multiplier?, label?, start_time?, end_time?, reason? }
 */
router.patch('/launch-config/phase/:phase', verifyAdminSecret, async (req, res) => {
  try {
    const { phase } = req.params as { phase: 'phase1' | 'phase2' | 'phase3' };
    const adminWallet = req.body.adminWallet || 'admin-system';
    const { multiplier, label, start_time, end_time, reason } = req.body;

    if (!['phase1', 'phase2', 'phase3'].includes(phase)) {
      return res.status(400).json({ error: 'Invalid phase' });
    }

    if (multiplier !== undefined && (multiplier < 0.1 || multiplier > 10)) {
      return res.status(400).json({ error: 'Multiplier must be between 0.1 and 10' });
    }

    const updates: any = {};
    if (multiplier !== undefined) updates.multiplier = multiplier;
    if (label !== undefined) updates.label = label;
    if (start_time !== undefined) updates.start_time = new Date(start_time);
    if (end_time !== undefined) updates.end_time = new Date(end_time);

    await launchConfigService.updatePhase(phase, updates, adminWallet, reason);

    // Log to audit trail
    await adminAuditService.log(adminWallet, `${phase}_updated`, 'launch_config', phase, null, updates, reason);

    res.json({
      success: true,
      message: `Phase ${phase} updated`,
      phase: await launchConfigService.getCurrentPhase(),
    });
  } catch (error) {
    console.error('[Admin] Failed to update launch phase:', error);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

/**
 * PATCH /api/admin/launch-config/toggle
 * Toggle launch bonus on/off (admin only)
 * Body: { is_active: boolean, reason?: string }
 */
router.patch('/launch-config/toggle', verifyAdminSecret, async (req, res) => {
  try {
    const { is_active, reason } = req.body;
    const adminWallet = req.body.adminWallet || 'admin-system';

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    await launchConfigService.toggleLaunchBonus(is_active, adminWallet, reason);

    // Log to audit trail
    await adminAuditService.log(adminWallet, 'launch_bonus_toggled', 'launch_config', 'launch_bonus', { is_active: !is_active }, { is_active }, reason);

    res.json({
      success: true,
      message: `Launch bonus ${is_active ? 'enabled' : 'disabled'}`,
      phase: await launchConfigService.getCurrentPhase(),
    });
  } catch (error) {
    console.error('[Admin] Failed to toggle launch bonus:', error);
    res.status(500).json({ error: 'Failed to toggle launch bonus' });
  }
});

// ── Badge Management ─────────────────────────────────────────────────

/**
 * GET /api/admin/badges
 * List all badge templates with active status
 */
router.get('/badges', verifyAdminSecret, async (_req, res) => {
  try {
    const templates = await badgeTemplateService.getTemplates();

    res.json({
      success: true,
      count: templates.length,
      badges: templates.map(t => ({
        template_key: t.template_key,
        category: t.category,
        display_name: t.display_name,
        description: t.description,
        multiplier_value: t.multiplier_value,
        duration_type: t.duration_type,
        is_hall_of_fame: t.is_hall_of_fame,
        dynamic_duration_days: t.dynamic_duration_days,
      })),
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

/**
 * GET /api/admin/badges/templates
 * List available rule templates (for admin UI dropdown)
 */
router.get('/badges/templates', verifyAdminSecret, async (_req, res) => {
  try {
    const templates = await badgeTemplateService.getTemplates();

    // Group by category
    const grouped: { [key: string]: any[] } = {};
    templates.forEach(t => {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push({
        key: t.template_key,
        name: t.display_name,
        multiplier: t.multiplier_value,
        duration: t.duration_type,
      });
    });

    res.json({
      success: true,
      categories: grouped,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch badge templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * POST /api/admin/badges/:wallet
 * Award badge to a wallet manually
 * Body: { template_key: string, position_id?: string, reason?: string }
 */
router.post('/badges/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = asString(req.params.wallet);
  const template_key = asString(req.body.template_key);
  const position_id = asString(req.body.position_id);
  const reason = asString(req.body.reason);
  const adminWallet = asString(req.body.adminWallet) || 'admin-system';

  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'Invalid wallet' });
  }
  if (!template_key) {
    return res.status(400).json({ error: 'template_key required' });
  }

  try {
    await badgeTemplateService.awardBadge(wallet, template_key, position_id, adminWallet);

    // Log to audit trail
    await adminAuditService.log(
      adminWallet,
      'badge_awarded',
      'badge',
      `${wallet}_${template_key}`,
      null,
      { template_key, position_id },
      reason
    );

    res.json({
      success: true,
      message: `Badge ${template_key} awarded to ${wallet.slice(0, 8)}...`,
      wallet,
      template_key,
    });
  } catch (error) {
    console.error('[Admin] Failed to award badge:', error);
    res.status(500).json({
      error: 'Failed to award badge',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/admin/badges/:wallet/:templateKey
 * Revoke badge from wallet
 * Body: { reason?: string }
 */
router.delete('/badges/:wallet/:templateKey', verifyAdminSecret, async (req, res) => {
  const wallet = asString(req.params.wallet);
  const templateKey = asString(req.params.templateKey);
  const reason = asString(req.body.reason);
  const adminWallet = asString(req.body.adminWallet) || 'admin-system';

  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'Invalid wallet' });
  }

  try {
    await badgeTemplateService.revokeBadge(wallet, templateKey);

    // Log to audit trail
    await adminAuditService.log(
      adminWallet,
      'badge_revoked',
      'badge',
      `${wallet}_${templateKey}`,
      { template_key: templateKey },
      null,
      reason
    );

    res.json({
      success: true,
      message: `Badge ${templateKey} revoked from ${wallet.slice(0, 8)}...`,
      wallet,
      template_key: templateKey,
    });
  } catch (error) {
    console.error('[Admin] Failed to revoke badge:', error);
    res.status(500).json({
      error: 'Failed to revoke badge',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/admin/badges/:wallet
 * Get all badges earned by a wallet
 */
router.get('/badges/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = asString(req.params.wallet);

  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'Invalid wallet' });
  }

  try {
    const result = await pool.query(
      `SELECT bd.badge_name, bd.description, bd.multiplier_value, brt.is_hall_of_fame, ub.awarded_at
       FROM user_badges ub
       JOIN badge_definitions bd ON ub.badge_id = bd.id
       LEFT JOIN badge_rule_templates brt ON bd.rule_template = brt.template_key
       WHERE ub.wallet = $1
       ORDER BY ub.awarded_at DESC`,
      [wallet]
    );

    const badges = result.rows;
    const stacking = await badgeTemplateService.calculateBadgeStacking(wallet);

    res.json({
      success: true,
      wallet,
      badgeCount: badges.length,
      badges,
      stacking: {
        topThreeBadges: stacking.topThreeBadges,
        remainingBadges: stacking.remainingBadges,
        totalMultiplier: stacking.totalMultiplier,
        hallOfFameMultiplier: stacking.hallOfFameMultiplier,
        finalMultiplier: stacking.finalMultiplier,
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch wallet badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// ============================================================
// Event Management Routes
// ============================================================

/**
 * GET /api/admin/events
 * List all events with filtering by type
 */
router.get('/events', verifyAdminSecret, async (req, res) => {
  try {
    const { type } = req.query;

    let eventsList: any[];
    if (type) {
      eventsList = await eventService.getEventsByType(type as string);
    } else {
      const result = await pool.query('SELECT * FROM events ORDER BY start_time DESC LIMIT 100');
      eventsList = result.rows;
    }

    res.json({
      success: true,
      events: eventsList,
      count: eventsList.length,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /api/admin/events
 * Create a new event
 */
router.post('/events', verifyAdminSecret, async (req, res) => {
  try {
    const { eventName, eventType, startTime, endTime, description, eligibleAssets, eligibleIndices, adminWallet } = req.body;

    if (!eventName || !eventType || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: eventName, eventType, startTime, endTime' });
    }

    const event = await eventService.createEvent(
      eventName,
      eventType,
      new Date(startTime),
      new Date(endTime),
      adminWallet || 'system',
      description,
      eligibleAssets,
      eligibleIndices
    );

    console.log(`[Admin] Created event: ${eventName}`);
    res.json({ success: true, event });
  } catch (error) {
    console.error('[Admin] Failed to create event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * GET /api/admin/events/news
 * Get recent news headlines (for News Reactor badge)
 */
router.get('/events/news', verifyAdminSecret, async (req, res) => {
  try {
    const { hoursBack = 24 } = req.query;
    const news = await eventService.getRecentNews(parseInt(hoursBack as string));

    res.json({
      success: true,
      news,
      count: news.length,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/**
 * POST /api/admin/events/news
 * Add a news headline
 */
router.post('/events/news', verifyAdminSecret, async (req, res) => {
  try {
    const { headline, source, marketImpact, assetSymbols, sentiment, adminWallet } = req.body;

    if (!headline || !source || !assetSymbols) {
      return res.status(400).json({ error: 'Missing required fields: headline, source, assetSymbols' });
    }

    const news = await eventService.addNewsHeadline(
      headline,
      source,
      marketImpact || 0,
      new Date(),
      assetSymbols,
      sentiment || 'neutral',
      adminWallet || 'system'
    );

    console.log(`[Admin] Added news headline: ${headline.slice(0, 50)}`);
    res.json({ success: true, news });
  } catch (error) {
    console.error('[Admin] Failed to add news:', error);
    res.status(500).json({ error: 'Failed to add news' });
  }
});

/**
 * GET /api/admin/events/:eventId/activity
 * Get activity/participation for an event
 */
router.get('/events/:eventId/activity', verifyAdminSecret, async (req, res) => {
  try {
    const eventId = asString(req.params.eventId);

    const count = await eventService.getEventActivityCount(eventId);
    const participants = await eventService.getEventParticipants(eventId);

    res.json({
      success: true,
      eventId,
      activityCount: count,
      participantCount: participants.length,
      participants: participants.slice(0, 100),
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch event activity:', error);
    res.status(500).json({ error: 'Failed to fetch event activity' });
  }
});

// ============================================================
// Configuration Management Routes
// ============================================================

/**
 * GET /api/admin/config
 * Get all configuration values
 */
router.get('/config', verifyAdminSecret, async (req, res) => {
  try {
    const config = await configService.getAllConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('[Admin] Failed to fetch config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * GET /api/admin/config/:key
 * Get specific configuration value
 */
router.get('/config/:key', verifyAdminSecret, async (req, res) => {
  try {
    const key = asString(req.params.key);
    const value = await configService.getConfig(key);

    if (!value) {
      return res.status(404).json({ error: `Configuration key not found: ${key}` });
    }

    res.json({ success: true, key, value });
  } catch (error) {
    console.error('[Admin] Failed to fetch config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * PATCH /api/admin/config/:key
 * Update a configuration value
 */
router.patch('/config/:key', verifyAdminSecret, async (req, res) => {
  try {
    const key = asString(req.params.key);
    const value = req.body.value;
    const reason = asString(req.body.reason);
    const adminWallet = asString(req.body.adminWallet) || 'system';

    if (!value || !reason) {
      return res.status(400).json({ error: 'Missing required fields: value, reason' });
    }

    await configService.setConfig(key, value, adminWallet, reason);

    console.log(`[Admin] Updated config: ${key}`);
    res.json({ success: true, message: `Updated ${key}` });
  } catch (error: any) {
    console.error('[Admin] Failed to update config:', error);
    res.status(400).json({ error: error.message || 'Failed to update configuration' });
  }
});

/**
 * GET /api/admin/config/:key/history
 * Get configuration change history
 */
router.get('/config/:key/history', verifyAdminSecret, async (req, res) => {
  try {
    const key = asString(req.params.key);
    const limit = asString(req.query.limit) || '50';

    const history = await configService.getConfigHistory(key, parseInt(limit));

    res.json({
      success: true,
      key,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch config history:', error);
    res.status(500).json({ error: 'Failed to fetch configuration history' });
  }
});

/**
 * POST /api/admin/config/batch
 * Update multiple configuration values at once
 */
router.post('/config/batch', verifyAdminSecret, async (req, res) => {
  try {
    const { updates, reason, adminWallet } = req.body;

    if (!updates || !reason) {
      return res.status(400).json({ error: 'Missing required fields: updates, reason' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await configService.setConfig(key, value, adminWallet || 'system', reason);
    }

    console.log(`[Admin] Batch updated ${Object.keys(updates).length} config values`);
    res.json({ success: true, message: 'Configuration updated', keysUpdated: Object.keys(updates) });
  } catch (error: any) {
    console.error('[Admin] Failed to batch update config:', error);
    res.status(400).json({ error: error.message || 'Failed to update configuration' });
  }
});

/**
 * GET /api/admin/config-schema
 * Get configuration schema (keys, descriptions, default values)
 */
router.get('/config-schema', verifyAdminSecret, async (req, res) => {
  try {
    const schema = {
      anti_farm: {
        description: 'Anti-farm rules to prevent exploitation',
        fields: {
          minPositionSizeUSD: { type: 'number', description: 'Minimum position size in USD' },
          minHoldHours: { type: 'number', description: 'Minimum hold time in hours' },
          washTradeWindowMinutes: { type: 'number', description: 'Wash trade detection window' },
          cooldownMinutes: { type: 'number', description: 'Cooldown between same trades' },
          maxDrawdownPercent: { type: 'number', description: 'Max drawdown before triggering filter' },
        },
      },
      multiplier_progression: {
        description: 'Claim multiplier progression settings',
        fields: {
          weeklyBonus: { type: 'number', description: 'Weekly activity bonus' },
          monthlyBonus: { type: 'number', description: 'Monthly activity bonus' },
          badgeBonus: { type: 'number', description: 'Per-badge multiplier bonus' },
          streakBonus: { type: 'number', description: 'Per-day streak multiplier' },
          streakBonusMax: { type: 'number', description: 'Max days to count for streak' },
          maxMultiplier: { type: 'number', description: 'Hard cap on claim multiplier' },
        },
      },
      launch_config: {
        description: 'Launch event multiplier phases',
        fields: {
          startDate: { type: 'string', description: 'Launch start date (ISO 8601)' },
          isActive: { type: 'boolean', description: 'Is launch event active' },
          week1Multiplier: { type: 'number', description: 'Multiplier for week 1' },
          week2Multiplier: { type: 'number', description: 'Multiplier for week 2' },
          week3PlusMultiplier: { type: 'number', description: 'Multiplier for week 3+' },
        },
      },
      referral_bonuses: {
        description: 'Referral reward tiers',
        fields: {
          kolDynamicMultiplier: { type: 'number', description: 'KOL dynamic multiplier' },
          kolPermanentMultiplier: { type: 'number', description: 'KOL permanent multiplier' },
          standardInviteXP: { type: 'number', description: 'XP for standard referral' },
          kolInviteXP: { type: 'number', description: 'XP for KOL referral' },
        },
      },
      badge_stacking: {
        description: 'Badge multiplier stacking rules',
        fields: {
          topThreeBadgesMultiplier: { type: 'number', description: 'Full multiplier for top 3' },
          remainingBadgesMultiplier: { type: 'number', description: 'Half multiplier for rest' },
          hardCap: { type: 'number', description: 'Hard cap on total stacked multiplier' },
          hallOfFameBypass: { type: 'boolean', description: 'Hall of Fame badges bypass cap' },
          hallOfFameBonus: { type: 'number', description: 'Bonus for Hall of Fame tier' },
        },
      },
      tracked_tokens: {
        description: 'RWA tokens with base multipliers',
        type: 'array',
      },
      airdrop_rules: {
        description: 'Airdrop eligibility and claim rules',
      },
      feature_flags: {
        description: 'Feature toggles for experimental features',
      },
    };

    res.json({ success: true, schema });
  } catch (error) {
    console.error('[Admin] Failed to fetch schema:', error);
    res.status(500).json({ error: 'Failed to fetch configuration schema' });
  }
});

// ============================================================
// Certificate Management Routes
// ============================================================

/**
 * GET /api/admin/certificates/:category
 * Get all certificates in a category
 */
router.get('/certificates/:category', verifyAdminSecret, async (req, res) => {
  try {
    const category = asString(req.params.category);
    const certs = await certificateService.getCertificatesByCategory(category);

    res.json({
      success: true,
      category,
      certificates: certs,
      count: certs.length,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

/**
 * POST /api/admin/certificates
 * Create a new certificate
 */
router.post('/certificates', verifyAdminSecret, async (req, res) => {
  try {
    const { name, category, displayName, multiplierValue, multiplierType, adminWallet } = req.body;

    if (!name || !category || !displayName || !multiplierValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cert = await certificateService.createCertificate(
      name,
      category,
      displayName,
      multiplierValue,
      multiplierType || 'permanent',
      adminWallet || 'system'
    );

    console.log(`[Admin] Created certificate: ${displayName}`);
    res.json({ success: true, certificate: cert });
  } catch (error: any) {
    console.error('[Admin] Failed to create certificate:', error);
    res.status(500).json({ error: error.message || 'Failed to create certificate' });
  }
});

/**
 * POST /api/admin/certificates/award/:wallet/:certificateId
 * Award a certificate to a user
 */
router.post('/certificates/award/:wallet/:certificateId', verifyAdminSecret, async (req, res) => {
  try {
    const wallet = asString(req.params.wallet);
    const certificateId = asString(req.params.certificateId);
    const adminWallet = asString(req.body.adminWallet) || 'system';

    await certificateService.awardCertificate(wallet, certificateId, adminWallet);

    console.log(`[Admin] Awarded certificate to ${wallet.slice(0, 8)}`);
    res.json({ success: true, message: 'Certificate awarded' });
  } catch (error: any) {
    console.error('[Admin] Failed to award certificate:', error);
    res.status(500).json({ error: error.message || 'Failed to award certificate' });
  }
});

/**
 * DELETE /api/admin/certificates/revoke/:wallet/:certificateId
 * Revoke a certificate
 */
router.delete('/certificates/revoke/:wallet/:certificateId', verifyAdminSecret, async (req, res) => {
  try {
    const wallet = asString(req.params.wallet);
    const certificateId = asString(req.params.certificateId);
    const adminWallet = asString(req.body.adminWallet) || 'system';
    const reason = asString(req.body.reason) || 'Admin revocation';

    await certificateService.revokeCertificate(
      wallet,
      certificateId,
      adminWallet,
      reason
    );

    res.json({ success: true, message: 'Certificate revoked' });
  } catch (error: any) {
    console.error('[Admin] Failed to revoke certificate:', error);
    res.status(500).json({ error: error.message || 'Failed to revoke certificate' });
  }
});

/**
 * GET /api/admin/certificates/wallet/:wallet
 * Get all certificates for a wallet
 */
router.get('/certificates/wallet/:wallet', verifyAdminSecret, async (req, res) => {
  try {
    const wallet = asString(req.params.wallet);
    const certs = await certificateService.getWalletCertificates(wallet);
    const multiplierBoost = await certificateService.getCertificateMultiplierBoost(wallet);

    res.json({
      success: true,
      wallet,
      certificates: certs,
      count: certs.length,
      multiplierBoost,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch wallet certificates:', error);
    res.status(500).json({ error: 'Failed to fetch wallet certificates' });
  }
});

/**
 * GET /api/admin/users/:wallet
 * Get user multiplier details and breakdown
 */
router.get('/users/:wallet', verifyAdminSecret, async (req, res) => {
  try {
    const wallet = asString(req.params.wallet);

    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Ensure user exists (creates if missing, updates last_active if exists)
    await positionService.ensureUserExists(wallet);

    const userResult = await pool.query(
      `SELECT u.wallet, u.total_xp, u.claim_multiplier, u.current_streak, u.created_at,
              COUNT(DISTINCT b.id) as badge_count
       FROM users u
       LEFT JOIN badges b ON u.wallet = b.wallet
       WHERE u.wallet = $1
       GROUP BY u.wallet, u.total_xp, u.claim_multiplier, u.current_streak, u.created_at`,
      [wallet]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRow = userResult.rows[0];

    const badges = await pool.query(
      `SELECT badge_name, earned_at FROM badges WHERE wallet = $1 ORDER BY earned_at DESC`,
      [wallet]
    );

    const certCount = await pool.query(
      `SELECT COUNT(*) as count FROM user_certificates WHERE wallet = $1 AND revoked_at IS NULL`,
      [wallet]
    );

    const stacking = await badgeTemplateService.calculateBadgeStacking(wallet);

    res.json({
      success: true,
      user: {
        wallet: userRow.wallet,
        xp_earnedshift_points: userRow.total_xp || 0,
        badge_count: parseInt(userRow.badge_count) || 0,
        certificate_count: parseInt(certCount.rows[0]?.count) || 0,
        claim_multiplier: parseFloat(userRow.claim_multiplier) || 1.0,
        current_streak: userRow.current_streak || 0,
        badges: badges.rows.map((b: any) => ({ name: b.badge_name, earned_at: b.earned_at })),
        permanent_multiplier: stacking.finalMultiplier,
        dynamic_multiplier: 0,
        total_multiplier: stacking.finalMultiplier,
        multiplier_breakdown: {
          base: 1.0,
          top_three_badges: stacking.topThreeBadges?.reduce((s: number, b: any) => s + (b.multiplier_value || 0), 0) || 0,
          remaining_badges: stacking.remainingBadges?.reduce((s: number, b: any) => s + (b.multiplier_value || 0) * 0.5, 0) || 0,
          hall_of_fame: stacking.hallOfFameMultiplier || 0,
          stacking_cap: stacking.finalMultiplier >= 2.0 ? 'cap_reached' : 'under_cap',
        },
        created_at: userRow.created_at,
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * GET /api/admin/dashboard
 * Get dashboard metrics and recent activity
 */
router.get('/dashboard', verifyAdminSecret, async (req, res) => {
  try {
    const [totalUsers, totalXp, badgeCount, certCount, hofCount, avgMultiplier, recentActivity] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM users`),
      pool.query(`SELECT COALESCE(SUM(total_xp), 0) as total FROM users`),
      pool.query(`SELECT COUNT(*) as count FROM badges WHERE earned_at > NOW() - INTERVAL '30 days'`),
      pool.query(`SELECT COUNT(*) as count FROM user_certificates WHERE awarded_at > NOW() - INTERVAL '30 days' AND revoked_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      pool.query(`SELECT COUNT(DISTINCT wallet) as count FROM badges WHERE badge_name IN ('iron_hands', 'the_believer', 'black_swan_buyer')`),
      pool.query(`SELECT AVG(claim_multiplier) as avg_mult FROM users`),
      pool.query(`SELECT id, action, resource_type, admin_wallet, created_at FROM admin_logs ORDER BY created_at DESC LIMIT 20`).catch(() => ({ rows: [] })),
    ]);

    res.json({
      success: true,
      metrics: {
        total_users: parseInt(totalUsers.rows[0].count) || 0,
        total_xp: parseFloat(totalXp.rows[0].total) || 0,
        badge_count: parseInt(badgeCount.rows[0].count) || 0,
        certificate_count: parseInt(certCount.rows[0].count) || 0,
        hof_count: parseInt(hofCount.rows[0].count) || 0,
        avg_multiplier: parseFloat(avgMultiplier.rows[0]?.avg_mult || '1.0') || 1.0,
      },
      recentActivity: recentActivity.rows.map((r: any) => ({
        id: r.id,
        action: r.action,
        resource_type: r.resource_type,
        admin_wallet: r.admin_wallet,
        created_at: r.created_at,
      })),
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/admin/audit
 * Get admin audit logs with optional filtering
 */
router.get('/audit', verifyAdminSecret, async (req, res) => {
  try {
    const { wallet, action, limit = 50 } = req.query;

    let query = `SELECT id, action, resource_type, resource_id, old_value, new_value, reason, admin_wallet, created_at FROM admin_logs WHERE 1=1`;
    const params: any[] = [];

    if (wallet) {
      query += ` AND resource_id = $${params.length + 1}`;
      params.push(wallet);
    }

    if (action) {
      query += ` AND action = $${params.length + 1}`;
      params.push(action);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string) || 50);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      logs: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * POST /api/admin/snag/link-badge/:badgeName/:snagBadgeId
 * Link a SHIFT badge to a SNAG badge ID
 */
router.post('/snag/link-badge/:badgeName/:snagBadgeId', verifyAdminSecret, async (req, res) => {
  try {
    const badgeName = asString(req.params.badgeName);
    const snagBadgeId = asString(req.params.snagBadgeId);
    const adminWallet = asString(req.body.adminWallet) || 'admin-system';

    await pool.query(
      `INSERT INTO snag_badge_mapping (shift_badge_name, snag_badge_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (shift_badge_name) DO UPDATE SET snag_badge_id = EXCLUDED.snag_badge_id`,
      [badgeName, snagBadgeId]
    );

    await adminAuditService.log(adminWallet, 'snag_badge_linked', 'snag_mapping', badgeName, null, { snag_badge_id: snagBadgeId }, 'Admin linked SHIFT badge to SNAG');

    res.json({ success: true, message: `Linked ${badgeName} to SNAG badge ${snagBadgeId}` });
  } catch (error) {
    console.error('[Admin] Failed to link badge:', error);
    res.status(500).json({ error: 'Failed to link badge' });
  }
});

/**
 * GET /api/admin/snag/badge-mappings
 * Get all SHIFT-to-SNAG badge mappings
 */
router.get('/snag/badge-mappings', verifyAdminSecret, async (req, res) => {
  try {
    const result = await pool.query(`SELECT shift_badge_name, snag_badge_id, created_at FROM snag_badge_mapping ORDER BY created_at DESC`);

    res.json({
      success: true,
      mappings: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[Admin] Failed to fetch badge mappings:', error);
    res.status(500).json({ error: 'Failed to fetch badge mappings' });
  }
});

/**
 * POST /api/admin/snag/sync-all
 * Trigger full SNAG sync for all users
 */
router.post('/snag/sync-all', verifyAdminSecret, async (req, res) => {
  try {
    const adminWallet = asString(req.body.adminWallet) || 'admin-system';

    // Trigger full sync using snagSyncService
    const startTime = Date.now();
    await snagSyncService.fullSync();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    const users = await pool.query(`SELECT COUNT(*) as count FROM users`);
    await adminAuditService.log(adminWallet, 'snag_full_sync', 'snag', 'all_users', null, { users_processed: users.rows[0].count }, 'Triggered full SNAG sync');

    res.json({
      success: true,
      message: `Full SNAG sync completed`,
      users_processed: parseInt(users.rows[0].count) || 0,
      duration: `${duration}s`,
    });
  } catch (error) {
    console.error('[Admin] Failed to trigger full SNAG sync:', error);
    res.status(500).json({ error: 'Failed to trigger full SNAG sync' });
  }
});

/**
 * POST /api/admin/recalculate-xp
 * Manually trigger XP recalculation for all users (or specific wallet)
 * Body: { wallet?: string } — if wallet provided, recalculate for that wallet only
 */
router.post('/recalculate-xp', verifyAdminSecret, async (req, res) => {
  const wallet = asString(req.body.wallet);

  try {
    if (wallet) {
      // Force XP recalculation for specific wallet by resetting last_xp_calc on their positions
      await pool.query(
        `UPDATE positions SET last_xp_calc = opened_at WHERE wallet = $1 AND status = 'open'`,
        [wallet]
      );
      console.log(`[Admin] Reset XP calc timestamps for ${wallet.slice(0, 8)}...`);
    } else {
      // Reset all positions — XP engine will recalculate on next cron run
      await pool.query(`UPDATE positions SET last_xp_calc = opened_at WHERE status = 'open' AND last_xp_calc IS NULL`);
    }

    // Also trigger badge check for shift_holder
    if (wallet) {
      const { badgeService } = await import('../services/badgeService');
      await badgeService.checkShiftHolder(wallet);
    }

    res.json({
      success: true,
      message: wallet
        ? `XP recalculation queued for ${wallet.slice(0, 8)}... — will apply on next XP engine run (within 60s)`
        : 'XP recalculation queued for all users',
      wallet: wallet || 'all',
    });
  } catch (error) {
    console.error('[Admin] Failed to trigger XP recalculation:', error);
    res.status(500).json({ error: 'Failed to trigger XP recalculation' });
  }
});

/**
 * GET /api/admin/position-diagnostic/:wallet
 * Diagnostic endpoint to check position data for a wallet
 */
router.get('/position-diagnostic/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = req.params.wallet as string;

  try {
    const positions = await pool.query(
      `SELECT id, asset, asset_mint, position_size_usd, status, created_at, opened_at, xp_generated, last_xp_calc, current_multiplier
       FROM positions WHERE wallet = $1 ORDER BY created_at DESC`,
      [wallet]
    );

    const user = await pool.query(
      `SELECT wallet, total_xp, snag_points FROM users WHERE wallet = $1`,
      [wallet]
    );

    res.json({
      wallet,
      userStats: user.rows[0] || null,
      positionsCount: positions.rows.length,
      positions: positions.rows.map((p: any) => ({
        id: p.id,
        asset: p.asset,
        assetMint: p.asset_mint,
        positionSizeUsd: p.position_size_usd,
        status: p.status,
        xpGenerated: p.xp_generated,
        lastXpCalc: p.last_xp_calc,
        currentMultiplier: p.current_multiplier,
        openedAt: p.opened_at,
        createdAt: p.created_at
      }))
    });
  } catch (error) {
    console.error('[Admin] Diagnostic query failed:', error);
    res.status(500).json({ error: 'Failed to fetch diagnostic data' });
  }
});

/**
 * POST /api/admin/force-badge-check
 * Force a badge eligibility check for a specific wallet
 * Body: { wallet: string }
 */
router.post('/force-badge-check', verifyAdminSecret, async (req, res) => {
  const wallet = asString(req.body.wallet);

  if (!wallet || wallet.length < 32) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  try {
    const { badgeService } = await import('../services/badgeService');

    // Check all available badges for this wallet
    const [shiftHolder, firstTrade] = await Promise.all([
      badgeService.checkShiftHolder(wallet),
      badgeService.checkFirstTrade(wallet),
    ]);

    const awarded = [shiftHolder, firstTrade].filter(Boolean).map((b: any) => b.badge_name);

    res.json({
      success: true,
      wallet,
      badgesAwarded: awarded,
      message: awarded.length > 0
        ? `Awarded ${awarded.length} badge(s): ${awarded.join(', ')}`
        : 'No new badges to award',
    });
  } catch (error) {
    console.error('[Admin] Failed to run badge check:', error);
    res.status(500).json({ error: 'Failed to run badge check' });
  }
});

/**
 * POST /api/admin/fix-zero-positions
 * Emergency fix: Updates positions with $0 size using Helius transaction data
 * Body: { wallet: string, positionId: string, solAmount: number }
 */
router.post('/fix-zero-positions', verifyAdminSecret, async (req, res) => {
  const wallet = asString(req.body.wallet);
  const positionId = asString(req.body.positionId);
  const solAmount = parseFloat(req.body.solAmount) || 0;

  if (!wallet || !positionId || solAmount <= 0) {
    return res.status(400).json({ error: 'Missing wallet, positionId, or solAmount' });
  }

  try {
    // Get SOL price
    const { jupiterPriceService } = await import('../services/jupiterPriceService');
    const solPrice = await jupiterPriceService.getPrice('So11111111111111111111111111111111111111112');
    const positionSizeUsd = solAmount * (solPrice ?? 0);

    // Update position
    await pool.query(
      `UPDATE positions SET position_size_usd = $1 WHERE id = $2 AND wallet = $3`,
      [positionSizeUsd, positionId, wallet]
    );

    // Trigger XP recalculation
    const { xpEngine } = await import('../services/xpEngine');
    await xpEngine.recalculateAllXP();

    res.json({
      success: true,
      wallet,
      positionId,
      solAmount,
      solPrice,
      positionSizeUsd,
      message: `Updated position size to $${positionSizeUsd.toFixed(2)}, XP recalculation queued`
    });
  } catch (error) {
    console.error('[Admin] Failed to fix zero position:', error);
    res.status(500).json({ error: 'Failed to fix position' });
  }
});

/**
 * POST /api/admin/wallet-resync/:wallet
 * Re-syncs a wallet's transaction history and fixes $0 position sizes
 * by re-reading stablecoin amounts from Helius enhanced transactions.
 * Also forces an immediate XP recalculation for that wallet.
 */
import { walletSyncService } from '../services/walletSyncService';
import { xpEngine } from '../services/xpEngine';
import { execute, query } from '../db/pool';

router.post('/wallet-resync/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = req.params.wallet as string;

  try {
    console.log(`[Admin] Re-syncing wallet: ${wallet}`);
    const startTime = Date.now();

    // Step 1: Run the wallet sync (replays tx history with correct USD values)
    const syncResult = await walletSyncService.syncWallet(wallet);

    // Step 2: Force XP recalculation
    const xpResult = await xpEngine.recalculateAllXP();

    // Step 3: Get updated totals
    const user = await pool.query(
      'SELECT total_xp, claim_multiplier FROM users WHERE wallet = $1',
      [wallet]
    );
    const positions = await pool.query(
      `SELECT asset, position_size_usd, status FROM positions WHERE wallet = $1 ORDER BY opened_at DESC`,
      [wallet]
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    res.json({
      success: true,
      wallet,
      duration: `${duration}s`,
      syncResult,
      xpResult,
      currentStats: {
        totalXp: user.rows[0]?.total_xp ?? 0,
        claimMultiplier: user.rows[0]?.claim_multiplier ?? 1.0,
        positions: positions.rows,
      },
    });
  } catch (error) {
    console.error('[Admin] Wallet re-sync failed:', error);
    res.status(500).json({ error: 'Wallet re-sync failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/fix-zero-positions
 * Fixes all positions with position_size_usd = 0 by setting a minimum
 * floor of $10 so XP accumulation can start immediately.
 * NOTE: A proper fix requires walletSync per wallet to get real amounts.
 */
router.post('/fix-zero-positions', verifyAdminSecret, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE positions
       SET position_size_usd = 10, updated_at = NOW()
       WHERE position_size_usd = 0 AND status = 'open'
       RETURNING id, wallet, asset`
    );

    // Force XP recalculation after fixing sizes
    await xpEngine.recalculateAllXP();

    res.json({
      success: true,
      fixed: result.rows.length,
      positions: result.rows,
      message: `Fixed ${result.rows.length} positions with $0 size. XP recalculation triggered.`,
    });
  } catch (error) {
    console.error('[Admin] Fix zero positions failed:', error);
    res.status(500).json({ error: 'Failed to fix zero positions' });
  }
});

/**
 * POST /api/admin/fix-undersized-positions
 * Bulk-fix wallets whose open positions were stored with position_size_usd < $1
 * due to the Jupiter multi-hop USDC extraction bug (took first input instead of summing all).
 * For each affected wallet: clears processed_transactions, deletes open positions, re-syncs.
 */
router.post('/fix-undersized-positions', verifyAdminSecret, async (req, res) => {
  try {
    // Find all distinct wallets with open positions under $1 (but > 0, to skip truly empty)
    const affected = await pool.query(
      `SELECT DISTINCT wallet FROM positions
       WHERE status = 'open' AND position_size_usd > 0 AND position_size_usd < 1`
    );

    const wallets: string[] = affected.rows.map((r: any) => r.wallet);
    const results: any[] = [];

    console.log(`[Admin] fix-undersized-positions: found ${wallets.length} affected wallets`);

    for (const wallet of wallets) {
      try {
        // Get tx signatures for open positions of this wallet
        const openPos = await pool.query(
          `SELECT tx_signature_open FROM positions WHERE wallet = $1 AND status = 'open'`,
          [wallet]
        );
        const sigs = openPos.rows.map((r: any) => r.tx_signature_open).filter(Boolean);

        // Clear processed_transactions so they get re-replayed
        if (sigs.length > 0) {
          await pool.query(
            `DELETE FROM processed_transactions WHERE tx_signature = ANY($1)`,
            [sigs]
          );
        }

        // Delete open positions
        await pool.query(`DELETE FROM positions WHERE wallet = $1 AND status = 'open'`, [wallet]);

        // Re-sync from Helius
        const syncResult = await walletSyncService.syncWallet(wallet);

        results.push({ wallet: wallet.slice(0, 8) + '…', positionsCreated: syncResult.positionsCreated });
        console.log(`[Admin] Re-synced ${wallet.slice(0, 8)}… → ${syncResult.positionsCreated} positions`);
      } catch (err: any) {
        results.push({ wallet: wallet.slice(0, 8) + '…', error: err?.message });
      }
    }

    // Trigger XP recalculation
    const xpResult = await xpEngine.recalculateAllXP();

    res.json({
      success: true,
      walletsFixed: wallets.length,
      results,
      xpResult,
    });
  } catch (error) {
    console.error('[Admin] fix-undersized-positions failed:', error);
    res.status(500).json({ error: 'Failed to fix undersized positions' });
  }
});

/**
 * POST /api/admin/force-resync/:wallet
 * Properly re-syncs a wallet by:
 * 1. Clearing processed_transactions for its open position tx signatures
 * 2. Deleting its open positions
 * 3. Re-running walletSyncService.syncWallet() with the fixed USDC extraction
 * This gets the correct position sizes from USDC swap inputs instead of $0.
 */
router.post('/force-resync/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = req.params.wallet as string;

  try {
    console.log(`[Admin] Force re-sync for wallet: ${wallet}`);
    const startTime = Date.now();

    // Step 1: Get open position tx signatures for this wallet
    const openTxs = await pool.query(
      `SELECT tx_signature_open FROM positions
       WHERE wallet = $1 AND status = 'open' AND tx_signature_open IS NOT NULL`,
      [wallet]
    );
    const signatures = openTxs.rows.map((r: any) => r.tx_signature_open);

    // Step 2: Remove those tx signatures from processed_transactions so they can be re-played
    if (signatures.length > 0) {
      await pool.query(
        `DELETE FROM processed_transactions WHERE tx_signature = ANY($1::text[])`,
        [signatures]
      );
    }

    // Step 3: Delete open positions for this wallet (will be re-created by sync)
    const deletedPositions = await pool.query(
      `DELETE FROM positions WHERE wallet = $1 AND status = 'open' RETURNING id, asset`,
      [wallet]
    );

    // Step 4: Re-sync wallet — will replay tx history with correct USDC extraction
    const syncResult = await walletSyncService.syncWallet(wallet);

    // Step 5: Force XP recalculation
    const xpResult = await xpEngine.recalculateAllXP();

    // Step 6: Get updated stats
    const user = await pool.query(
      'SELECT total_xp, claim_multiplier FROM users WHERE wallet = $1',
      [wallet]
    );
    const positions = await pool.query(
      `SELECT asset, position_size_usd, status, opened_at FROM positions
       WHERE wallet = $1 ORDER BY opened_at DESC LIMIT 20`,
      [wallet]
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    res.json({
      success: true,
      wallet,
      duration: `${duration}s`,
      clearedTxs: signatures.length,
      deletedPositions: deletedPositions.rows.length,
      syncResult,
      xpResult,
      currentStats: {
        totalXp: user.rows[0]?.total_xp ?? 0,
        claimMultiplier: user.rows[0]?.claim_multiplier ?? 1.0,
        positions: positions.rows,
      },
    });
  } catch (error) {
    console.error('[Admin] Force re-sync failed:', error);
    res.status(500).json({ error: 'Force re-sync failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/snag-sync
 * Triggers a full SNAG production sync immediately and returns diagnostic info.
 * Useful to verify SNAG_API_KEY + SNAG_LOYALTY_CURRENCY_ID are working.
 */

router.post('/snag-sync', verifyAdminSecret, async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('[Admin] Manual SNAG sync triggered');

    // Config check
    const snagConfigured = !!(config.snagApiKey && config.snagLoyaltyCurrencyId);

    if (!snagConfigured) {
      return res.status(400).json({
        success: false,
        error: 'SNAG not fully configured',
        snagApiKey: config.snagApiKey ? '✅ set' : '❌ missing',
        snagLoyaltyCurrencyId: config.snagLoyaltyCurrencyId ? '✅ set' : '❌ missing',
      });
    }

    await snagSyncService.fullSync();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    res.json({
      success: true,
      message: 'SNAG full sync completed',
      duration: `${duration}s`,
      snagApiKey: '✅ set',
      snagLoyaltyCurrencyId: '✅ set',
      snagBaseUrl: config.snagBaseUrl,
    });
  } catch (error) {
    console.error('[Admin] SNAG sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'SNAG sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/snag-config
 * Returns SNAG config status (keys masked) — quick health check.
 */
router.get('/snag-config', verifyAdminSecret, async (_req, res) => {
  res.json({
    snagApiKey: config.snagApiKey ? `${config.snagApiKey.slice(0, 8)}…` : '❌ not set',
    snagLoyaltyCurrencyId: config.snagLoyaltyCurrencyId ? `${config.snagLoyaltyCurrencyId.slice(0, 8)}…` : '❌ not set',
    snagBaseUrl: config.snagBaseUrl || '❌ not set',
    orgId: config.snagOrganizationId ? `${config.snagOrganizationId.slice(0, 8)}…` : '❌ not set',
    websiteId: config.snagWebsiteId ? `${config.snagWebsiteId.slice(0, 8)}…` : '❌ not set',
  });
});

/**
 * POST /api/admin/snag-reset-sync-log/:wallet
 * Resets xp_sync_log for a wallet to 0, forcing the next full sync to push
 * the complete total_xp as a single transaction to SNAG (rebuilds balance).
 */
router.post('/snag-reset-sync-log/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = req.params.wallet as string;
  try {
    await pool.query(
      `DELETE FROM xp_sync_log WHERE wallet = $1`,
      [wallet]
    );
    const user = await pool.query('SELECT total_xp FROM users WHERE wallet = $1', [wallet]);
    res.json({
      success: true,
      message: `Sync log cleared for ${wallet}. Next snag-sync will push full total_xp.`,
      total_xp: user.rows[0]?.total_xp ?? 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/snag-probe/:wallet
 * Directly queries SNAG production API for a wallet — raw response,
 * shows exactly what SNAG knows about the user and whether transactions landed.
 */
router.get('/snag-probe/:wallet', verifyAdminSecret, async (req, res) => {
  const wallet = req.params.wallet as string;

  try {
    const axios = (await import('axios')).default;
    const client = axios.create({
      baseURL: config.snagBaseUrl,
      headers: { 'x-api-key': config.snagApiKey, 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    // 1. Look up the account in SNAG
    const accountSearch = await client.get('/api/loyalty/accounts', {
      params: { websiteId: config.snagWebsiteId, walletAddress: wallet, limit: 1 },
    }).catch(e => ({ data: null, error: e?.response?.data || e.message }));

    const account = (accountSearch as any).data?.data?.[0];

    // 2. If found, get their full balance
    let balance = null;
    let balanceRaw = null;
    if (account?.id) {
      const balRes = await client.get(`/api/loyalty/accounts/${account.id}`, {
        params: { websiteId: config.snagWebsiteId },
      }).catch(e => ({ data: null, error: e?.response?.data || e.message }));
      balanceRaw = (balRes as any).data;
      balance = balanceRaw?.points ?? balanceRaw?.loyaltyBalance ?? balanceRaw?.balance;
    }

    // 3. Get recent transactions for this wallet
    const txSearch = account?.id
      ? await client.get('/api/loyalty/transactions', {
          params: { websiteId: config.snagWebsiteId, accountId: account.id, limit: 5 },
        }).catch(e => ({ data: null, error: e?.response?.data || e.message }))
      : null;

    res.json({
      wallet,
      snagAccount: account || null,
      pointsBalance: balance,
      balanceRawFields: balanceRaw ? Object.keys(balanceRaw) : null,
      recentTransactions: (txSearch as any)?.data?.data || [],
      accountSearchError: !(accountSearch as any).data ? (accountSearch as any).error : null,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'SNAG probe failed',
      message: error?.response?.data || error.message,
    });
  }
});

// ── On-Chain Holders ─────────────────────────────────────────────────────────

// Simple in-memory cache: refreshed at most every 5 minutes
let holdersCache: { data: OnChainHoldersResponse; fetchedAt: number } | null = null;
const HOLDERS_CACHE_TTL_MS = 5 * 60 * 1000;

interface TokenHolderStats {
  symbol: string;
  name: string;
  mint: string;
  holders: number;
  error?: string;
}

interface OnChainHoldersResponse {
  tokens: TokenHolderStats[];
  uniqueHolders: number;
  totalHolderSlots: number;
  fetchedAt: string;
}

/**
 * Fetch all token account owners for a single mint via Helius DAS `getTokenAccounts`.
 * Paginates automatically (1000 per page) and filters zero-balance accounts.
 * Returns a Set of owner wallet addresses.
 */
async function fetchMintOwners(mint: string, heliusApiKey: string): Promise<Set<string>> {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  const owners = new Set<string>();
  let page = 1;

  while (true) {
    const resp = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: `holders-${mint.slice(0, 8)}-p${page}`,
        method: 'getTokenAccounts',
        params: { mint, limit: 1000, page },
      },
      { timeout: 20_000 }
    );

    const accounts: any[] = resp.data?.result?.token_accounts ?? [];
    if (accounts.length === 0) break;

    for (const acct of accounts) {
      // Only count accounts that actually hold tokens (amount > 0)
      if (acct.owner && Number(acct.amount) > 0) {
        owners.add(acct.owner);
      }
    }

    // If fewer than 1000 returned, we've hit the last page
    if (accounts.length < 1000) break;
    page++;
  }

  return owners;
}

/**
 * GET /api/admin/onchain-holders
 * Returns live on-chain holder counts for each of the 6 SHIFT trading tokens
 * plus the total unique wallet count across all tokens.
 * Results are cached for 5 minutes to avoid rate-limiting Helius.
 * Pass ?force=1 to bypass cache and re-fetch immediately.
 */
router.get('/onchain-holders', verifyAdminSecret, async (req, res) => {
  try {
    // Return cached data if fresh enough (and not forcing refresh)
    const forceRefresh = req.query.force === '1';
    if (!forceRefresh && holdersCache && Date.now() - holdersCache.fetchedAt < HOLDERS_CACHE_TTL_MS) {
      return res.json({ ...holdersCache.data, cached: true });
    }

    if (!config.heliusApiKey) {
      return res.status(503).json({ error: 'Helius API key not configured' });
    }

    // Tokens to check (the 6 SHIFT trading assets — excludes governance SHIFT token)
    const TRADING_TOKENS = [
      { symbol: 'TSL2L', name: 'Shift Tesla 2x Long',        mint: '6afjZE5Qv9WF5K1adBgTxtWyenJ7ZerH6BVAzmoSHFT' },
      { symbol: 'TSL1S', name: 'Shift Tesla 1x Short',       mint: 'bNPXng6hSVas7LWiNQyvpGcPYtY1ZmFY6WP49ymSHFT' },
      { symbol: 'SOX3L', name: 'Shift Semiconductor 3x Long', mint: 'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT' },
      { symbol: 'SOX3S', name: 'Shift Semiconductor 3x Short',mint: '7GoxZQ7gCh1mg1b3AUqd7cyPqiUp4y2NRxM9A5zSHFT' },
      { symbol: 'SPX3S', name: 'Shift S&P500 3x Short',      mint: '67ik3PpEXBJA1km29rZMMKwhgvvjrKpNMoaZyTsSHFT' },
      { symbol: 'SPX3L', name: 'Shift S&P500 3x Long',       mint: '12y35E6btjazuaSjjwq99MobbycbkFsFvm8s5QpaSHFT' },
    ];

    // Fetch all token holders in parallel
    const ownerSets = await Promise.all(
      TRADING_TOKENS.map(async (token) => {
        try {
          const owners = await fetchMintOwners(token.mint, config.heliusApiKey!);
          return { token, owners, error: undefined };
        } catch (err: any) {
          console.warn(`[Admin] onchain-holders fetch failed for ${token.symbol}:`, err?.message);
          return { token, owners: new Set<string>(), error: err?.message as string };
        }
      })
    );

    // Build per-token stats
    const tokens: TokenHolderStats[] = ownerSets.map(({ token, owners, error }) => ({
      symbol: token.symbol,
      name: token.name,
      mint: token.mint,
      holders: owners.size,
      ...(error ? { error } : {}),
    }));

    // Compute unique holders across ALL tokens (set union)
    const allOwners = new Set<string>();
    for (const { owners } of ownerSets) {
      for (const o of owners) allOwners.add(o);
    }

    const payload: OnChainHoldersResponse = {
      tokens,
      uniqueHolders: allOwners.size,
      totalHolderSlots: tokens.reduce((sum, t) => sum + t.holders, 0),
      fetchedAt: new Date().toISOString(),
    };

    // Cache it
    holdersCache = { data: payload, fetchedAt: Date.now() };

    console.log(
      `[Admin] onchain-holders: ${payload.uniqueHolders} unique across ${tokens.map(t => `${t.symbol}=${t.holders}`).join(', ')}`
    );

    res.json({ ...payload, cached: false });
  } catch (error: any) {
    console.error('[Admin] onchain-holders failed:', error);
    res.status(500).json({ error: 'Failed to fetch on-chain holders', message: error?.message });
  }
});

export default router;
