"use strict";
// ============================================================
// Position Service — Track open/close positions in PostgreSQL
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.positionService = exports.PositionService = void 0;
const pool_1 = require("../db/pool");
const analytics_1 = require("../utils/analytics");
class PositionService {
    /**
     * Ensure a user record exists (upsert on first seen wallet).
     */
    async ensureUserExists(wallet) {
        await (0, pool_1.execute)(`INSERT INTO users (wallet, last_active)
       VALUES ($1, NOW())
       ON CONFLICT (wallet) DO UPDATE SET last_active = NOW(), updated_at = NOW()`, [wallet]);
    }
    /**
     * Open a new position. Returns false if tx already processed (dedup).
     */
    async openPosition(wallet, asset, assetMint, positionSizeUSD, tokenAmount, priceAtOpen, txSignature, timestamp) {
        // Check dedup
        const existing = await (0, pool_1.queryOne)('SELECT tx_signature FROM processed_transactions WHERE tx_signature = $1', [txSignature]);
        if (existing) {
            console.log(`[Position] Duplicate tx skipped: ${txSignature.slice(0, 16)}...`);
            return false;
        }
        // Ensure user exists
        await this.ensureUserExists(wallet);
        // Insert position
        await (0, pool_1.queryOne)(`INSERT INTO positions 
        (wallet, asset, asset_mint, position_size_usd, token_amount, price_at_open, 
         opened_at, status, tx_signature_open)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)`, [wallet, asset, assetMint, positionSizeUSD, tokenAmount, priceAtOpen, timestamp, txSignature]);
        // Mark tx as processed
        await (0, pool_1.execute)('INSERT INTO processed_transactions (tx_signature) VALUES ($1) ON CONFLICT DO NOTHING', [txSignature]);
        // Dispatch server-side GA4 trade event for tracking
        (0, analytics_1.trackGA4EventForWallet)(wallet, 'rwa_trade_executed', {
            asset,
            position_size_usd: positionSizeUSD,
            token_amount: tokenAmount || 0,
            price_at_open: priceAtOpen || 0,
            trade_type: 'buy',
            tx_signature: txSignature
        }).catch(() => { });
        console.log(`[Position] Opened: ${wallet.slice(0, 8)}... | ${asset} | $${positionSizeUSD.toFixed(2)}`);
        return true;
    }
    /**
     * Close a position matching wallet + asset (FIFO — closes oldest open).
     */
    async closePosition(wallet, asset, txSignature, timestamp) {
        // Check dedup
        const existing = await (0, pool_1.queryOne)('SELECT tx_signature FROM processed_transactions WHERE tx_signature = $1', [txSignature]);
        if (existing)
            return null;
        // Find oldest open position for this wallet + asset
        const position = await (0, pool_1.queryOne)(`SELECT * FROM positions 
       WHERE wallet = $1 AND asset = $2 AND status = 'open' 
       ORDER BY opened_at ASC LIMIT 1`, [wallet, asset]);
        if (!position) {
            console.log(`[Position] No open position found to close: ${wallet.slice(0, 8)}... | ${asset}`);
            return null;
        }
        // Close it
        await (0, pool_1.execute)(`UPDATE positions
       SET closed_at = $1, status = 'closed', tx_signature_close = $2
       WHERE id = $3`, [timestamp, txSignature, position.id]);
        // Mark tx processed
        await (0, pool_1.execute)('INSERT INTO processed_transactions (tx_signature) VALUES ($1) ON CONFLICT DO NOTHING', [txSignature]);
        // ── 24h early-sell claw-back ──
        // If sold within 24h of the on-chain buy, zero out all XP earned on this position.
        const holdMs = timestamp.getTime() - new Date(position.opened_at).getTime();
        const holdHours = holdMs / (1000 * 60 * 60);
        if (holdHours < 24) {
            const xpEarned = Number(position.xp_generated);
            if (xpEarned > 0) {
                // Subtract from users.total_xp (floor at 0)
                await (0, pool_1.execute)(`UPDATE users SET total_xp = GREATEST(0, total_xp - $1), updated_at = NOW()
           WHERE wallet = $2`, [xpEarned, wallet]);
                console.log(`[Position] ⚠️  Early sell claw-back: ${wallet.slice(0, 8)}... | ${asset} | -${xpEarned.toFixed(2)} XP (held ${holdHours.toFixed(1)}h < 24h)`);
            }
            // Zero out xp_generated on the position record
            await (0, pool_1.execute)(`UPDATE positions SET xp_generated = 0 WHERE id = $1`, [position.id]);
        }
        // Dispatch server-side GA4 trade event for tracking
        (0, analytics_1.trackGA4EventForWallet)(wallet, 'rwa_trade_executed', {
            asset,
            position_size_usd: Number(position.position_size_usd),
            trade_type: 'sell',
            tx_signature: txSignature,
            hold_duration_hours: holdHours
        }).catch(() => { });
        console.log(`[Position] Closed: ${wallet.slice(0, 8)}... | ${asset} | held ${this.formatDuration(position.opened_at, timestamp)}${holdHours < 24 ? ' ⚠️ early sell — XP clawed back' : ''}`);
        return position;
    }
    /**
     * Get all active (open) positions for a wallet.
     */
    async getActivePositions(wallet) {
        return (0, pool_1.query)(`SELECT * FROM positions WHERE wallet = $1 AND status = 'open' ORDER BY opened_at ASC`, [wallet]);
    }
    /**
     * Get all positions for a wallet (any status).
     */
    async getAllPositions(wallet) {
        return (0, pool_1.query)(`SELECT * FROM positions WHERE wallet = $1 ORDER BY opened_at DESC LIMIT 50`, [wallet]);
    }
    /**
     * Get all open positions across all users (for cron recalc).
     */
    async getAllOpenPositions() {
        return (0, pool_1.query)(`SELECT * FROM positions WHERE status = 'open' ORDER BY wallet, opened_at`);
    }
    /**
     * Get position age in weeks and days.
     */
    getPositionAge(openedAt, referenceDate) {
        const now = referenceDate || new Date();
        const diffMs = now.getTime() - new Date(openedAt).getTime();
        const totalHours = diffMs / (1000 * 60 * 60);
        const totalDays = totalHours / 24;
        const weeks = Math.floor(totalDays / 7);
        const days = Math.floor(totalDays % 7);
        return { weeks, days, hours: Math.floor(totalHours) };
    }
    /**
     * Update position XP and multiplier after recalculation.
     */
    async updatePositionXP(positionId, xpGenerated, multiplier) {
        await (0, pool_1.execute)(`UPDATE positions 
       SET xp_generated = $1, current_multiplier = $2, last_xp_calc = NOW() 
       WHERE id = $3`, [xpGenerated, multiplier, positionId]);
    }
    /**
     * Mark a position as filtered (anti-farm).
     */
    async filterPosition(positionId) {
        await (0, pool_1.execute)(`UPDATE positions SET status = 'filtered' WHERE id = $1`, [positionId]);
    }
    formatDuration(from, to) {
        const { weeks, days } = this.getPositionAge(from, to);
        if (weeks > 0)
            return `${weeks}w ${days}d`;
        return `${days}d`;
    }
}
exports.PositionService = PositionService;
exports.positionService = new PositionService();
//# sourceMappingURL=positionService.js.map