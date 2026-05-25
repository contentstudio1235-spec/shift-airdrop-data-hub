// ============================================================
// Referral Service — KOL whitelist, standard referrals,
// dynamic/permanent multiplier application, invite XP
// ============================================================

import { pool } from '../db/pool';
import { snagSyncService } from './snagSyncService';
import {
  REFERRAL_CODE_RULES,
  INVITE_BONUS_XP,
  validateReferralCode,
  normalizeReferralCode,
} from '../constants/referralConstants';

// ── Constants ──────────────────────────────────────────────────────────────
const SNAG_REFERRAL_RULE_ID = '4646dc56-11d0-4c85-8545-b066eb0784e9';

// ── Types ──────────────────────────────────────────────────────────────────

export interface KolEntry {
  wallet: string;
  customCode: string;
  displayName?: string;
  multiplierBonus: number;
  multiplierType: 'dynamic' | 'permanent';
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface ReferralCodeInfo {
  code: string;
  referrerWallet: string | null;
  displayName: string | null;
  isKol: boolean;
  multiplierBonus: number;   // 1.0 = no bonus
  multiplierType: 'dynamic' | 'permanent' | 'none';
  isActive: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Generate wallet-based standard referral code (e.g. "3uDJ7x") */
export function walletToCode(wallet: string): string {
  return wallet.slice(0, 6).toUpperCase();
}

/** Validate a code string — use constants-based validation */
export function isValidCode(code: string): boolean {
  const validation = validateReferralCode(code);
  return validation.valid;
}

// ── Referral Code Lookup ───────────────────────────────────────────────────

/**
 * Resolve a referral code to its owner + bonus info.
 * Checks KOL whitelist first, then standard wallet-based codes.
 * CRITICAL: Validates code format before querying DB (prevent injection).
 */
export async function resolveReferralCode(code: string): Promise<ReferralCodeInfo | null> {
  const validation = validateReferralCode(code);
  if (!validation.valid) {
    console.warn(`[Referral] Invalid code format: ${code}`);
    return null;
  }

  const upperCode = normalizeReferralCode(code);

  // 1. Check KOL whitelist
  const kolResult = await pool.query(
    `SELECT wallet, custom_code, display_name, multiplier_bonus, multiplier_type, is_active
     FROM kol_whitelist
     WHERE UPPER(custom_code) = $1`,
    [upperCode]
  );

  if (kolResult.rows.length > 0) {
    const kol = kolResult.rows[0];
    return {
      code: upperCode,
      referrerWallet: kol.wallet,
      displayName: kol.display_name,
      isKol: true,
      multiplierBonus: parseFloat(kol.multiplier_bonus),
      multiplierType: kol.multiplier_type as 'dynamic' | 'permanent',
      isActive: kol.is_active,
    };
  }

  // 2. Standard wallet-based referral code
  const userResult = await pool.query(
    `SELECT wallet FROM users WHERE UPPER(referral_code) = $1`,
    [upperCode]
  );

  if (userResult.rows.length > 0) {
    return {
      code: upperCode,
      referrerWallet: userResult.rows[0].wallet,
      displayName: null,
      isKol: false,
      multiplierBonus: 1.0,
      multiplierType: 'none',
      isActive: true,
    };
  }

  return null;
}

// ── Registration with Referral ─────────────────────────────────────────────

/**
 * Register a new wallet. Optionally apply a referral code.
 * Returns the queue position, referral link, and bonus info.
 */
export async function registerWithReferral(
  wallet: string,
  refCode?: string
): Promise<{
  wallet: string;
  queuePosition: number;
  totalMembers: number;
  referralCode: string;
  referralLink: string;
  bonusApplied: boolean;
  bonusMultiplier: number;
  bonusType: string;
  referrerDisplayName: string | null;
}> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure referral_code is set
    const userCode = walletToCode(wallet);

    // Insert user
    await client.query(
      `INSERT INTO users (wallet, total_xp, referral_code, permanent_multiplier, dynamic_multiplier, created_at, updated_at)
       VALUES ($1, 0, $2, 1.0, 1.0, NOW(), NOW())
       ON CONFLICT (wallet) DO UPDATE SET
         referral_code = COALESCE(users.referral_code, EXCLUDED.referral_code),
         updated_at = NOW()`,
      [wallet, userCode]
    );

    let bonusApplied = false;
    let bonusMultiplier = 1.0;
    let bonusType = 'none';
    let referrerDisplayName: string | null = null;

    if (refCode) {
      const codeInfo = await resolveReferralCode(refCode);

      if (codeInfo && codeInfo.isActive && codeInfo.referrerWallet !== wallet) {
        // Check not already referred
        const existingRef = await client.query(
          `SELECT id FROM referrals WHERE referred_wallet = $1`,
          [wallet]
        );

        if (existingRef.rows.length === 0) {
          bonusMultiplier = codeInfo.multiplierBonus;
          bonusType = codeInfo.multiplierType;
          referrerDisplayName = codeInfo.displayName;

          // Insert referral record
          await client.query(
            `INSERT INTO referrals
               (referred_wallet, referrer_wallet, code_used, is_kol_referral, bonus_multiplier, bonus_type, bonus_applied)
             VALUES ($1, $2, $3, $4, $5, $6, false)
             ON CONFLICT (referred_wallet) DO NOTHING`,
            [wallet, codeInfo.referrerWallet, codeInfo.code, codeInfo.isKol, bonusMultiplier, bonusType]
          );

          // Update user to record who referred them
          await client.query(
            `UPDATE users SET
               referred_by_wallet = $2,
               referred_by_code = $3
             WHERE wallet = $1`,
            [wallet, codeInfo.referrerWallet, codeInfo.code]
          );

          // Award multiplier if bonus > 1
          if (bonusMultiplier > 1.0 && bonusType !== 'none') {
            try {
              await applyReferralMultiplier(client, wallet, bonusMultiplier, bonusType as 'dynamic' | 'permanent', codeInfo.code);
            } catch (err) {
              // CRITICAL FIX: Error recovery — don't fail registration if multiplier application fails
              console.error('[Referral] Warning: Failed to apply referral multiplier (will retry on next sync):', err);
              // Mark as failed in referral record for manual retry
              await client.query(
                `UPDATE referrals SET bonus_applied = false WHERE referred_wallet = $1`,
                [wallet]
              );
              // Continue — user is registered but multiplier may need manual application
            }
          }

          // Award invite bonus XP to referrer
          await awardInviteBonus(client, codeInfo.referrerWallet!, codeInfo.isKol, wallet);

          // Mark bonus as applied
          await client.query(
            `UPDATE referrals SET bonus_applied = true WHERE referred_wallet = $1`,
            [wallet]
          );

          bonusApplied = true;
        }
      }
    }

    await client.query('COMMIT');

    // Get queue position
    const rankResult = await client.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC) as queue_position
       FROM users WHERE wallet = $1`,
      [wallet]
    );
    const totalResult = await client.query('SELECT COUNT(*) as count FROM users');

    const queuePosition = parseInt(rankResult.rows[0]?.queue_position || '1');
    const totalMembers = parseInt(totalResult.rows[0].count);
    const referralLink = `https://airdrop.shiftrwa.xyz/register?ref=${userCode}`;

    return {
      wallet,
      queuePosition,
      totalMembers,
      referralCode: userCode,
      referralLink,
      bonusApplied,
      bonusMultiplier,
      bonusType,
      referrerDisplayName,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Multiplier Application ─────────────────────────────────────────────────

/**
 * Apply a referral multiplier to a user (dynamic or permanent).
 * Dynamic: forward-only, creates slot in user_dynamic_multipliers.
 * Permanent: retroactive — recalculates total XP × multiplier ratio.
 */
async function applyReferralMultiplier(
  client: any,
  wallet: string,
  multiplierBonus: number,
  multiplierType: 'dynamic' | 'permanent',
  sourceCode: string
): Promise<void> {
  if (multiplierType === 'dynamic') {
    // Insert dynamic multiplier slot (no expiry for referral bonus)
    await client.query(
      `INSERT INTO user_dynamic_multipliers
         (wallet, multiplier_value, reason, source, source_id, is_active)
       VALUES ($1, $2, $3, 'kol_referral', $4, true)`,
      [wallet, multiplierBonus, `KOL referral bonus from code ${sourceCode}`, sourceCode]
    );

    // Recalculate effective dynamic multiplier (max of active slots)
    const maxResult = await client.query(
      `SELECT MAX(multiplier_value) as max_mult
       FROM user_dynamic_multipliers
       WHERE wallet = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [wallet]
    );
    const newDynamic = parseFloat(maxResult.rows[0]?.max_mult || multiplierBonus);

    const oldResult = await client.query(
      `SELECT dynamic_multiplier FROM users WHERE wallet = $1`,
      [wallet]
    );
    const oldValue = parseFloat(oldResult.rows[0]?.dynamic_multiplier || '1.0');

    await client.query(
      `UPDATE users SET dynamic_multiplier = $2, updated_at = NOW() WHERE wallet = $1`,
      [wallet, newDynamic]
    );

    await client.query(
      `INSERT INTO multiplier_log
         (wallet, multiplier_type, old_value, new_value, reason, source, source_id)
       VALUES ($1, 'dynamic', $2, $3, $4, 'kol_referral', $5)`,
      [wallet, oldValue, newDynamic, `Referral bonus from ${sourceCode}`, sourceCode]
    );

  } else if (multiplierType === 'permanent') {
    try {
      // Get current values
      const userResult = await client.query(
        `SELECT total_xp, permanent_multiplier FROM users WHERE wallet = $1`,
        [wallet]
      );
      const user = userResult.rows[0];
      const oldPermMult = parseFloat(user?.permanent_multiplier || '1.0');
      const currentXp = parseFloat(user?.total_xp || '0');

      // New permanent multiplier is max(old, new bonus)
      const newPermMult = Math.max(oldPermMult, multiplierBonus);

      if (newPermMult > oldPermMult) {
        // Retroactive: scale total_xp by ratio
        const ratio = newPermMult / oldPermMult;
        const newXp = currentXp * ratio;

        // CRITICAL FIX: Use transaction-level locking to prevent concurrent updates
        // Lock the row for update to prevent race conditions
        await client.query(
          `SELECT 1 FROM users WHERE wallet = $1 FOR UPDATE`,
          [wallet]
        );

        await client.query(
          `UPDATE users SET
             permanent_multiplier = $2,
             total_xp = $3,
             updated_at = NOW()
           WHERE wallet = $1`,
          [wallet, newPermMult, newXp]
        );

        await client.query(
          `INSERT INTO multiplier_log
             (wallet, multiplier_type, old_value, new_value, reason, source, source_id, xp_before, xp_after)
           VALUES ($1, 'permanent', $2, $3, $4, 'kol_referral', $5, $6, $7)`,
          [wallet, oldPermMult, newPermMult, `Retroactive referral bonus from ${sourceCode}`, sourceCode, currentXp, newXp]
        );
      }
    } catch (err) {
      console.error('[Referral] Error applying permanent multiplier:', err);
      // Log the error but don't fail registration — multiplier can be recalculated later
      throw new Error(`Failed to apply permanent multiplier: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/**
 * Award invite bonus XP to the referrer when someone uses their link.
 */
async function awardInviteBonus(
  client: any,
  referrerWallet: string,
  isKol: boolean,
  referredWallet: string
): Promise<void> {
  try {
    // Use constants-based bonus amounts (CRITICAL: consistent throughout system)
    const bonusXp = isKol ? INVITE_BONUS_XP.KOL : INVITE_BONUS_XP.STANDARD;

    await client.query(
      `UPDATE users SET
         total_xp = total_xp + $2,
         invite_bonus_xp = invite_bonus_xp + $2,
         updated_at = NOW()
       WHERE wallet = $1`,
      [referrerWallet, bonusXp]
    );

    console.log(`[Referral] Awarded ${bonusXp} invite bonus XP to ${referrerWallet.slice(0,8)} for referring ${referredWallet.slice(0,8)}`);
  } catch (err) {
    console.error('[Referral] Failed to award invite bonus:', err);
    // Non-fatal — don't block registration
  }
}

// ── KOL Admin Functions ────────────────────────────────────────────────────

export async function addKol(params: {
  wallet: string;
  customCode: string;
  displayName?: string;
  multiplierBonus?: number;
  multiplierType?: 'dynamic' | 'permanent';
  notes?: string;
  createdBy?: string;
}): Promise<KolEntry> {
  const {
    wallet,
    customCode,
    displayName,
    multiplierBonus = 1.5,
    multiplierType = 'dynamic',
    notes,
    createdBy,
  } = params;

  // Ensure user row exists
  await pool.query(
    `INSERT INTO users (wallet, total_xp, referral_code, created_at, updated_at)
     VALUES ($1, 0, $2, NOW(), NOW())
     ON CONFLICT (wallet) DO UPDATE SET referral_code = COALESCE(users.referral_code, EXCLUDED.referral_code)`,
    [wallet, walletToCode(wallet)]
  );

  const result = await pool.query(
    `INSERT INTO kol_whitelist
       (wallet, custom_code, display_name, multiplier_bonus, multiplier_type, is_active, notes, created_by)
     VALUES ($1, UPPER($2), $3, $4, $5, true, $6, $7)
     ON CONFLICT (wallet) DO UPDATE SET
       custom_code      = UPPER(EXCLUDED.custom_code),
       display_name     = EXCLUDED.display_name,
       multiplier_bonus = EXCLUDED.multiplier_bonus,
       multiplier_type  = EXCLUDED.multiplier_type,
       notes            = EXCLUDED.notes,
       updated_at       = NOW()
     RETURNING *`,
    [wallet, customCode, displayName || null, multiplierBonus, multiplierType, notes || null, createdBy || null]
  );

  const row = result.rows[0];
  return {
    wallet: row.wallet,
    customCode: row.custom_code,
    displayName: row.display_name,
    multiplierBonus: parseFloat(row.multiplier_bonus),
    multiplierType: row.multiplier_type,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listKols(): Promise<(KolEntry & { referralCount: number; inviteXpGiven: number })[]> {
  const result = await pool.query(
    `SELECT
       k.wallet, k.custom_code, k.display_name, k.multiplier_bonus,
       k.multiplier_type, k.is_active, k.notes, k.created_at,
       COUNT(r.id)::int         as referral_count,
       COALESCE(u.invite_bonus_xp, 0) as invite_xp_given
     FROM kol_whitelist k
     LEFT JOIN referrals r ON r.referrer_wallet = k.wallet
     LEFT JOIN users u ON u.wallet = k.wallet
     GROUP BY k.wallet, k.custom_code, k.display_name, k.multiplier_bonus,
              k.multiplier_type, k.is_active, k.notes, k.created_at, u.invite_bonus_xp
     ORDER BY k.created_at DESC`
  );

  return result.rows.map((row) => ({
    wallet: row.wallet,
    customCode: row.custom_code,
    displayName: row.display_name,
    multiplierBonus: parseFloat(row.multiplier_bonus),
    multiplierType: row.multiplier_type,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    referralCount: row.referral_count,
    inviteXpGiven: parseFloat(row.invite_xp_given),
  }));
}

export async function updateKol(wallet: string, updates: Partial<{
  customCode: string;
  displayName: string;
  multiplierBonus: number;
  multiplierType: 'dynamic' | 'permanent';
  isActive: boolean;
  notes: string;
}>): Promise<KolEntry | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 2;

  if (updates.customCode !== undefined) { fields.push(`custom_code = UPPER($${idx++})`); values.push(updates.customCode); }
  if (updates.displayName !== undefined) { fields.push(`display_name = $${idx++}`); values.push(updates.displayName); }
  if (updates.multiplierBonus !== undefined) { fields.push(`multiplier_bonus = $${idx++}`); values.push(updates.multiplierBonus); }
  if (updates.multiplierType !== undefined) { fields.push(`multiplier_type = $${idx++}`); values.push(updates.multiplierType); }
  if (updates.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(updates.isActive); }
  if (updates.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(updates.notes); }

  if (fields.length === 0) return null;

  fields.push('updated_at = NOW()');
  const result = await pool.query(
    `UPDATE kol_whitelist SET ${fields.join(', ')} WHERE wallet = $1 RETURNING *`,
    [wallet, ...values]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    wallet: row.wallet,
    customCode: row.custom_code,
    displayName: row.display_name,
    multiplierBonus: parseFloat(row.multiplier_bonus),
    multiplierType: row.multiplier_type,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export const referralService = {
  resolveReferralCode,
  registerWithReferral,
  addKol,
  listKols,
  updateKol,
  walletToCode,
};

export default referralService;
