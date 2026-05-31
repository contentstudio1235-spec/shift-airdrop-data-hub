// ============================================================
// Google Analytics 4 (Measurement Protocol) Routing Service
// ============================================================

import { Router } from 'express';
import axios from 'axios';
import { query, queryOne, execute } from '../db/pool';

const router = Router();

// GA4 Measurement parameters
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-16YK1Q7QHD';
const GA_API_SECRET = process.env.GA_API_SECRET || 'aG-1_t6JSD-n9qSKJSDh2kg'; // Placeholder, replace with custom GCP secret

/**
 * POST /api/analytics/associate
 * Unifies Solana wallet with GA4 Client ID and Snag referral code server-side
 */
router.post('/associate', async (req: any, res: any) => {
  const { wallet, clientId, referralCode } = req.body;

  if (!wallet || !clientId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: wallet and clientId are mandatory.'
    });
  }

  console.log(`[Analytics] Ingesting association for wallet ${wallet.slice(0, 8)}...`);

  try {
    // 1. Log association to our local PostgreSQL DB (upsert user profile)
    await execute(
      `INSERT INTO users (wallet, ga_user_id, snag_custom_referral_code, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (wallet) 
       DO UPDATE SET ga_user_id = $2, snag_custom_referral_code = COALESCE(users.snag_custom_referral_code, $3), updated_at = NOW()`,
      [wallet, clientId, referralCode || null]
    );

    // 2. Dispatch server-side event to GA4 via Measurement Protocol
    const gaPayload = {
      client_id: clientId,
      events: [
        {
          name: 'wallet_link_completed',
          params: {
            solana_wallet: wallet,
            referral_code: referralCode || 'organic',
            engagement_time_msec: 100
          }
        }
      ]
    };

    const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
    
    await axios.post(gaUrl, gaPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[Analytics] ✅ Successfully dispatched association event to GA4 for ${wallet.slice(0, 8)}`);

    return res.status(200).json({
      success: true,
      message: 'Attribution association compiled and synced successfully.'
    });
  } catch (err: any) {
    console.error('[Analytics] ❌ Failed to compile association:', err.message);
    // Return standard success to client to avoid blocking the frontend wallet flow, but log error
    return res.status(200).json({
      success: true,
      warning: 'Local mapping saved, but GA4 sync encountered error.',
      details: err.message
    });
  }
});

/**
 * GET /api/analytics/dashboard-stats
 * Returns stitched session metrics, funnel conversion steps, and recent mapping history
 */
router.get('/dashboard-stats', async (req: any, res: any) => {
  try {
    // 1. Get total users
    const totalUsersRes = await queryOne('SELECT COUNT(*) as count FROM users');
    
    // 2. Get stitched users (users with ga_user_id)
    const stitchedUsersRes = await queryOne('SELECT COUNT(*) as count FROM users WHERE ga_user_id IS NOT NULL');
    
    // 3. Get total unique holders with active on-chain positions
    const activeHoldersRes = await queryOne("SELECT COUNT(DISTINCT wallet) as count FROM positions WHERE status = 'open'");
    
    // 4. Get total trading volume (sum of position size of all positions in USD)
    const totalVolumeRes = await queryOne("SELECT COALESCE(SUM(position_size_usd), 0) as total FROM positions");
    
    // 5. Get recent stitched profiles
    const recentStitched = await query(
      `SELECT wallet, ga_user_id, snag_custom_referral_code, total_xp, snag_points, updated_at 
       FROM users 
       WHERE ga_user_id IS NOT NULL 
       ORDER BY updated_at DESC 
       LIMIT 10`
    );
    
    // 6. Get counts for our conversion funnels (AUM, Trading, Holder, Referral)
    // AUM Funnel Counts:
    const fAum1 = Number(stitchedUsersRes?.count || 0);
    
    const fAum2Res = await queryOne('SELECT COUNT(DISTINCT wallet) as count FROM positions');
    const fAum2 = Number(fAum2Res?.count || 0);
    
    const fAum3 = Number(activeHoldersRes?.count || 0);
    
    const fAum4Res = await queryOne("SELECT COUNT(DISTINCT wallet) as count FROM positions WHERE status = 'open' AND opened_at < NOW() - INTERVAL '24 hours'");
    const fAum4 = Number(fAum4Res?.count || 0);
    
    // Unique Holder Funnel Counts:
    const fH1Res = await queryOne('SELECT COUNT(*) as count FROM users WHERE snag_user_id IS NOT NULL');
    const fH1 = Number(fH1Res?.count || 0);
    
    const fH2 = fAum1;
    const fH3 = fAum2;
    
    // Brand Referral Funnel Counts:
    const fR1Res = await queryOne('SELECT COUNT(*) as count FROM users WHERE referred_by_code IS NOT NULL OR referred_by_wallet IS NOT NULL');
    const fR1 = Number(fR1Res?.count || 0);
    
    const fR2Res = await queryOne('SELECT COUNT(*) as count FROM users WHERE (referred_by_code IS NOT NULL OR referred_by_wallet IS NOT NULL) AND ga_user_id IS NOT NULL');
    const fR2 = Number(fR2Res?.count || 0);
    
    const fR3Res = await queryOne('SELECT COUNT(*) as count FROM users WHERE snag_custom_referral_code IS NOT NULL');
    const fR3 = Number(fR3Res?.count || 0);
    
    return res.status(200).json({
      success: true,
      metrics: {
        totalUsers: Number(totalUsersRes?.count || 0),
        stitchedUsers: fAum1,
        activeHolders: fAum3,
        totalVolume: Number(totalVolumeRes?.total || 0),
      },
      funnels: {
        aum: [
          { name: 'Wallet Stitched', count: fAum1 },
          { name: 'Opened Position', count: fAum2 },
          { name: 'Active Holder', count: fAum3 },
          { name: 'Long Term (>24h)', count: fAum4 }
        ],
        holder: [
          { name: 'Snag Identity Link', count: fH1 },
          { name: 'Session Stitched', count: fH2 },
          { name: 'On-chain Purchase', count: fH3 }
        ],
        referral: [
          { name: 'Referred Landings', count: fR1 },
          { name: 'Stitched Referred', count: fR2 },
          { name: 'Referrers Created', count: fR3 }
        ]
      },
      recentStitched
    });
  } catch (err: any) {
    console.error('[Analytics GET] Failed to fetch stats:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
