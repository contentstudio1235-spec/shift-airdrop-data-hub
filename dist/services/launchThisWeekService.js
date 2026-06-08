"use strict";
// ============================================================
// Launch This Week Service — powers GET /api/pulse/launch-this-week
// ============================================================
// HARVEST-001 (MR !30, score 81). Synthesizes 4 Agency Agent
// outputs into a per-channel marketing performance summary for
// the M1 paid-acquisition operator's 9am workflow.
//
// Hard-scoped to:
//   - Active campaigns (campaigns.is_archived = FALSE)
//   - This week's launches (campaigns.created_at >= week start)
//   - Hardcoded 7-day data window (matches card name "Launch
//     this week"; does NOT honor the global F1 fwindow URL)
//
// Per-channel computation:
//   - signups       = COUNT(user_profiles WHERE first_utm_source = channel)
//   - stitched      = signups WHERE profile is identity-stitched
//   - holders       = signups WHERE wallet has any position record
//   - htft_median   = median(first_trade.opened_at - profile.first_seen_at)
//   - spend         = SUM(campaigns.budget_usd) across all active campaigns
//                     in this channel
//   - cac           = spend / holders (NULL when spend or holders is 0)
//   - coverage_pct  = stitched / signups (per channel)
//
// Confidence gates (Analytics Reporter):
//   - utm_medium IN ('cpc','paid-social','display'): signups >= 50
//   - utm_medium IN ('kol','affiliate'):             holders >= 20
//   - else:                                          signups >= 30
//   - universal floor for CAC:                       holders >= 3
// Channels below gates land in `gatheringSignal`, not `rankedChannels`.
//
// Direct = unattributed: source='direct' excluded from rankedChannels.
// Surface coverageOverall in response so frontend can render the global
// "X% of holders unattributed" footer chip.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports._clearLaunchThisWeekCache = _clearLaunchThisWeekCache;
exports.getLaunchThisWeekSnapshot = getLaunchThisWeekSnapshot;
const pool_1 = require("../db/pool");
const CACHE_TTL_MS = 60_000;
const WINDOW_DAYS = 7;
// Confidence-gate thresholds (Analytics Reporter §4)
const GATE_PAID = 50; // cpc, paid-social, display
const GATE_KOL = 20; // kol, affiliate (smaller cohorts inherent)
const GATE_OTHER = 30; // organic, referral, email, social, qr
const GATE_HOLDERS_FOR_CAC = 3; // universal floor for CAC computation
const PAID_MEDIUMS = new Set(['cpc', 'paid-social', 'display']);
const KOL_MEDIUMS = new Set(['kol', 'affiliate']);
const cache = new Map();
/** Test helper — clears module-level cache. */
function _clearLaunchThisWeekCache() { cache.clear(); }
function toNumber(v, fallback = 0) {
    if (v === null || v === undefined)
        return fallback;
    if (typeof v === 'number')
        return Number.isFinite(v) ? v : fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function passesConfidenceGate(row) {
    const medium = row.medium ?? '';
    let threshold;
    let metric;
    if (PAID_MEDIUMS.has(medium)) {
        threshold = GATE_PAID;
        metric = 'signups';
    }
    else if (KOL_MEDIUMS.has(medium)) {
        threshold = GATE_KOL;
        metric = 'holders';
    }
    else {
        threshold = GATE_OTHER;
        metric = 'signups';
    }
    const actual = metric === 'signups' ? row.signups : row.holders;
    if (actual >= threshold)
        return { pass: true };
    const remaining = threshold - actual;
    return {
        pass: false,
        reason: `needs ${remaining} more ${metric} (${actual}/${threshold})`,
    };
}
async function getLaunchThisWeekSnapshot() {
    const cached = cache.get('snapshot');
    if (cached && cached.expiresAt > Date.now())
        return cached.data;
    // 1. Active campaigns this week — group by utm_source so we know which
    //    sources have intentional launches AND what budget rolls up per source.
    //    SUM(budget_usd) returns NULL when every row in the group has NULL.
    const campaignRows = await (0, pool_1.query)(`
    SELECT
      LOWER(utm_source) AS utm_source,
      LOWER(utm_medium) AS utm_medium,
      COUNT(*)::bigint AS campaign_count,
      SUM(budget_usd)::numeric AS spend_usd,
      COUNT(*) FILTER (WHERE budget_usd IS NULL)::bigint AS missing_spend_count
    FROM campaigns
    WHERE is_archived = FALSE
      AND created_at >= date_trunc('week', NOW())
    GROUP BY LOWER(utm_source), LOWER(utm_medium)
    ORDER BY utm_source, utm_medium
  `);
    if (campaignRows.length === 0) {
        // Truly empty state — no campaigns launched this week.
        const snapshot = {
            computedAt: new Date().toISOString(),
            windowDays: WINDOW_DAYS,
            weekStart: await getWeekStartISO(),
            activeCampaignCount: 0,
            rankedChannels: [],
            gatheringSignal: [],
            coverageOverall: 0,
            campaignsMissingSpend: 0,
        };
        cache.set('snapshot', { expiresAt: Date.now() + CACHE_TTL_MS, data: snapshot });
        return snapshot;
    }
    // 2. Per-channel attribution + holder/HTFT rollup. Mirrors the
    //    user_profiles.first_utm_source pattern from attributionService
    //    but constrained to last 7 days AND to the active source set.
    const sources = campaignRows.map(r => r.utm_source);
    // Reviewer-caught BLOCKER #1: ga_user_id + snag_user_id live on `users`,
    // not `user_profiles`. Mirror the attributionService.ts pattern (line 65)
    // which joins users to user_profiles via primary_wallet.
    // Reviewer-caught BLOCKER #2: identity_links must filter unlinked_at IS NULL
    // (per migration 017 unique active index).
    const placeholdersOffset1 = sources.map((_, i) => `$${i + 1}`).join(',');
    const attrRows = await (0, pool_1.query)(`
    WITH window_profiles AS (
      SELECT
        LOWER(p.first_utm_source) AS source,
        p.profile_id,
        p.primary_wallet,
        p.first_seen_at,
        (
          u.ga_user_id IS NOT NULL
          OR u.snag_user_id IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM identity_links il
            WHERE il.profile_id = p.profile_id
              AND il.unlinked_at IS NULL
          )
        ) AS is_stitched
      FROM user_profiles p
      LEFT JOIN users u ON u.wallet = p.primary_wallet
      WHERE p.merged_into_profile_id IS NULL
        AND p.first_seen_at >= NOW() - INTERVAL '7 days'
        AND p.first_utm_source IS NOT NULL
        AND LOWER(p.first_utm_source) IN (${placeholdersOffset1})
    ),
    first_trades AS (
      SELECT wallet, MIN(opened_at) AS first_at
      FROM positions
      GROUP BY wallet
    ),
    joined AS (
      SELECT
        wp.source,
        wp.profile_id,
        wp.is_stitched,
        ft.first_at,
        wp.first_seen_at,
        CASE
          WHEN ft.first_at IS NOT NULL AND ft.first_at >= wp.first_seen_at
          THEN EXTRACT(EPOCH FROM (ft.first_at - wp.first_seen_at))
          ELSE NULL
        END AS htft_seconds
      FROM window_profiles wp
      LEFT JOIN first_trades ft ON ft.wallet = wp.primary_wallet
    )
    SELECT
      source,
      COUNT(*)::bigint AS signups,
      COUNT(*) FILTER (WHERE is_stitched)::bigint AS stitched,
      COUNT(*) FILTER (WHERE first_at IS NOT NULL)::bigint AS holders,
      PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY htft_seconds)::float AS htft_median_seconds
    FROM joined
    GROUP BY source
  `, sources);
    const attrBySource = new Map(attrRows.map(r => [r.source, r]));
    // 3. Compute overall coverage from THIS week's signups (any source vs direct).
    const coverageRow = await (0, pool_1.queryOne)(`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (
        WHERE first_utm_source IS NOT NULL
          AND LOWER(first_utm_source) <> 'direct'
          AND first_utm_source <> ''
      )::bigint AS attributed
    FROM user_profiles
    WHERE merged_into_profile_id IS NULL
      AND first_seen_at >= NOW() - INTERVAL '7 days'
  `);
    const totalSignups = toNumber(coverageRow?.total);
    const attributedSignups = toNumber(coverageRow?.attributed);
    const coverageOverall = totalSignups > 0 ? attributedSignups / totalSignups : 0;
    // 4. Merge campaign + attribution + gate per channel. Exclude direct
    //    (Analytics Reporter: Direct is residual, not a channel).
    const channels = campaignRows
        .filter(c => c.utm_source !== 'direct')
        .map(c => {
        const attr = attrBySource.get(c.utm_source);
        const signups = toNumber(attr?.signups);
        const stitched = toNumber(attr?.stitched);
        const holders = toNumber(attr?.holders);
        const spendUSD = c.spend_usd === null ? null : toNumber(c.spend_usd);
        const htftSec = attr?.htft_median_seconds;
        const htftHours = htftSec === null || htftSec === undefined
            ? null
            : Math.round(toNumber(htftSec) / 3600 * 10) / 10;
        // CAC requires both spend AND a minimum holder count (one whale skews).
        const cac = spendUSD !== null && holders >= GATE_HOLDERS_FOR_CAC
            ? Math.round(spendUSD / holders * 100) / 100
            : null;
        const row = {
            source: c.utm_source,
            medium: c.utm_medium || null,
            campaignCount: toNumber(c.campaign_count),
            signups,
            stitched,
            holders,
            spendUSD,
            cac,
            htftMedianHours: htftHours,
            coveragePct: signups > 0 ? Math.round((stitched / signups) * 1000) / 10 : 0,
            gatePass: true,
        };
        const gate = passesConfidenceGate(row);
        row.gatePass = gate.pass;
        if (!gate.pass)
            row.gateReason = gate.reason;
        return row;
    });
    // 5. Sort: rankedChannels by CAC ascending (when spend present), then by
    //    holders descending as a tiebreaker / fallback. gatheringSignal grouped
    //    separately, sorted by signups descending so the closest-to-passing are first.
    const ranked = channels
        .filter(c => c.gatePass)
        .sort((a, b) => {
        if (a.cac !== null && b.cac !== null)
            return a.cac - b.cac;
        if (a.cac !== null)
            return -1;
        if (b.cac !== null)
            return 1;
        // Fallback per Analytics Reporter: rank by HTFT (lower is better)
        if (a.htftMedianHours !== null && b.htftMedianHours !== null) {
            return a.htftMedianHours - b.htftMedianHours;
        }
        return b.holders - a.holders;
    });
    const gathering = channels
        .filter(c => !c.gatePass)
        .sort((a, b) => b.signups - a.signups);
    const campaignsMissingSpend = campaignRows.reduce((sum, r) => sum + toNumber(r.missing_spend_count), 0);
    const activeCampaignCount = campaignRows.reduce((sum, r) => sum + toNumber(r.campaign_count), 0);
    const snapshot = {
        computedAt: new Date().toISOString(),
        windowDays: WINDOW_DAYS,
        weekStart: await getWeekStartISO(),
        activeCampaignCount,
        rankedChannels: ranked,
        gatheringSignal: gathering,
        coverageOverall: Math.round(coverageOverall * 1000) / 10,
        campaignsMissingSpend,
    };
    cache.set('snapshot', { expiresAt: Date.now() + CACHE_TTL_MS, data: snapshot });
    return snapshot;
}
async function getWeekStartISO() {
    const row = await (0, pool_1.queryOne)(`SELECT date_trunc('week', NOW())::date::text AS ws`);
    return row?.ws ?? new Date().toISOString().slice(0, 10);
}
//# sourceMappingURL=launchThisWeekService.js.map