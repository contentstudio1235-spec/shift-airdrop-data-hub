import axios from 'axios';
import { queryOne } from '../db/pool';

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-16YK1Q7QHD';
const GA_API_SECRET = process.env.GA_API_SECRET || 'aG-1_t6JSD-n9qSKJSDh2kg';

/**
 * Dispatches a server-side hit to Google Analytics 4 via Measurement Protocol.
 */
export async function trackGA4Event(clientId: string, eventName: string, params: Record<string, any>): Promise<boolean> {
  if (!clientId) return false;
  
  const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
  const payload = {
    client_id: clientId,
    events: [{
      name: eventName,
      params: {
        ...params,
        engagement_time_msec: 100
      }
    }]
  };
  
  try {
    const res = await axios.post(gaUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return res.status === 204 || res.status === 200;
  } catch (err: any) {
    console.error(`[Analytics Utility] ❌ Failed to dispatch GA4 event ${eventName}:`, err.message);
    return false;
  }
}

/**
 * Resolves a Solana wallet to its stitched ga_user_id and dispatches GA4 event server-side.
 */
export async function trackGA4EventForWallet(wallet: string, eventName: string, params: Record<string, any>): Promise<boolean> {
  try {
    const user = await queryOne('SELECT ga_user_id FROM users WHERE wallet = $1', [wallet]);
    if (!user || !user.ga_user_id) {
      // Return false if user has no stitched GA4 client ID yet, keeping operations silent and non-blocking
      return false;
    }
    return await trackGA4Event(user.ga_user_id, eventName, {
      ...params,
      solana_wallet: wallet
    });
  } catch (err: any) {
    console.error(`[Analytics Utility] ❌ Wallet resolution lookup failed for ${wallet.slice(0, 8)}...:`, err.message);
    return false;
  }
}
