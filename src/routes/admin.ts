// ============================================================
// Admin Routes — Sync triggers, KOL management
// ============================================================

import express from 'express';
import { snagSyncService } from '../services/snagSyncService';
import { referralService } from '../services/referralService';
import { holdingService } from '../services/holdingService';
import { positionService } from '../services/positionService';
import { jupiterPriceService } from '../services/jupiterPriceService';
import { TRACKED_TOKENS } from '../config/tokens';
import { pool } from '../db/pool';

interface TokenBalance {
  symbol: string;
  mint: string;
  onChainBalance: number;
}

const router = express.Router();

/**
 * Middleware: Verify admin secret header
 * Protects the sync endpoint from unauthorized triggers
 */
const verifyAdminSecret = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const secret = req.headers['x-admin-key'] as string | undefined;
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret) {
    console.warn('[Admin] ADMIN_SECRET not configured');
    return res.status(500).json({ error: 'Server not configured' });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn('[Admin] Invalid admin secret');
    return res.status(401).json({ error: 'Unauthorized' });
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
  const { wallet } = req.params;

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

export default router;
