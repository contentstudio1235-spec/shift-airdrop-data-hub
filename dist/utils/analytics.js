"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackGA4Event = trackGA4Event;
exports.trackGA4EventForWallet = trackGA4EventForWallet;
const axios_1 = __importDefault(require("axios"));
const pool_1 = require("../db/pool");
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-16YK1Q7QHD';
const GA_API_SECRET = process.env.GA_API_SECRET || 'aG-1_t6JSD-n9qSKJSDh2kg';
/**
 * Dispatches a server-side hit to Google Analytics 4 via Measurement Protocol.
 */
async function trackGA4Event(clientId, eventName, params) {
    if (!clientId)
        return false;
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
        const res = await axios_1.default.post(gaUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        return res.status === 204 || res.status === 200;
    }
    catch (err) {
        console.error(`[Analytics Utility] ❌ Failed to dispatch GA4 event ${eventName}:`, err.message);
        return false;
    }
}
/**
 * Resolves a Solana wallet to its stitched ga_user_id and dispatches GA4 event server-side.
 */
async function trackGA4EventForWallet(wallet, eventName, params) {
    try {
        const user = await (0, pool_1.queryOne)('SELECT ga_user_id FROM users WHERE wallet = $1', [wallet]);
        if (!user || !user.ga_user_id) {
            // Return false if user has no stitched GA4 client ID yet, keeping operations silent and non-blocking
            return false;
        }
        return await trackGA4Event(user.ga_user_id, eventName, {
            ...params,
            solana_wallet: wallet
        });
    }
    catch (err) {
        console.error(`[Analytics Utility] ❌ Wallet resolution lookup failed for ${wallet.slice(0, 8)}...:`, err.message);
        return false;
    }
}
//# sourceMappingURL=analytics.js.map