"use strict";
// ============================================================
// utmService — UTM normalization + validation (Phase A)
// ============================================================
// Pure functions implementing the rules from the utm-tracking skill:
//   1. Lowercase always
//   2. utm_medium MUST be in approved list (drop if not + log violation)
//   3. utm_source MUST be in approved list OR match Snag pattern → roll up
//   4. Browser/UA-pattern sources: reject
//   5. utm_campaign: kept as-is (lowercase pre-applied); format violation
//      flagged but value still passes through for now
//
// Backed by utm_approved_sources / utm_approved_mediums tables seeded in
// migration 021. Allow-lists are cached in-memory for 5 minutes to avoid
// hammering the DB on every landing.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNAG_ROLLUP_SOURCE = void 0;
exports._resetUtmCaches = _resetUtmCaches;
exports.getApprovedSources = getApprovedSources;
exports.getApprovedMediums = getApprovedMediums;
exports.normalizeUtm = normalizeUtm;
exports.logViolations = logViolations;
const pool_1 = require("../db/pool");
// ── Constants ────────────────────────────────────────────────────────────────
/**
 * 6-char Snag referral code pattern.
 *
 * Snag codes are emitted as uppercase A-Z0-9 (e.g. DYENZ3, 6MCTDC) — see the
 * A-Z doc section E2. We deliberately accept upper OR digits-only here so
 * mixed-case echoes from upstream URL rewriting still rollup, but we EXCLUDE
 * lowercase letters to avoid catching everyday English words like `safari`,
 * `tiktok`, `reddit` etc. that would otherwise pass a case-insensitive match.
 */
const SNAG_CODE_PATTERN = /^[A-Z0-9]{6}$/;
/** utm_campaign lowercase + hyphens convention (skill rule). */
const CAMPAIGN_PATTERN = /^[a-z0-9-]+$/;
/** Browser / user-agent strings that have leaked into utm_source historically. */
const BROWSER_UA_SOURCES = new Set([
    'trust_ios_browser',
    'trust-ios-browser',
    'safari',
    'chrome',
    'firefox',
    'edge',
    'opera',
    'brave',
    'samsung-internet',
]);
/** Canonical rollup destination for Snag referral codes. Must exist in utm_approved_sources. */
exports.SNAG_ROLLUP_SOURCE = 'snag-referrals';
/** Cache TTL for approved-values lookups. */
const CACHE_TTL_MS = 5 * 60 * 1000;
let approvedSourcesCache = null;
let approvedMediumsCache = null;
/**
 * Reset both caches. Intended for tests only.
 */
function _resetUtmCaches() {
    approvedSourcesCache = null;
    approvedMediumsCache = null;
}
async function loadApprovedSources() {
    const now = Date.now();
    if (approvedSourcesCache && approvedSourcesCache.expiresAt > now) {
        return approvedSourcesCache.values;
    }
    const rows = await (0, pool_1.query)(`SELECT source FROM utm_approved_sources`);
    const values = new Set(rows.map(r => r.source));
    approvedSourcesCache = { values, expiresAt: now + CACHE_TTL_MS };
    return values;
}
async function loadApprovedMediums() {
    const now = Date.now();
    if (approvedMediumsCache && approvedMediumsCache.expiresAt > now) {
        return approvedMediumsCache.values;
    }
    const rows = await (0, pool_1.query)(`SELECT medium FROM utm_approved_mediums`);
    const values = new Set(rows.map(r => r.medium));
    approvedMediumsCache = { values, expiresAt: now + CACHE_TTL_MS };
    return values;
}
// ── Public allow-list accessors (for the GET endpoints) ──────────────────────
async function getApprovedSources() {
    const set = await loadApprovedSources();
    return [...set].sort();
}
async function getApprovedMediums() {
    const set = await loadApprovedMediums();
    return [...set].sort();
}
// ── Internal helpers ─────────────────────────────────────────────────────────
/**
 * Coerce a raw query-string value (possibly array, null, undefined) into a
 * trimmed string, or null if effectively empty.
 */
function coerce(raw) {
    if (raw === null || raw === undefined)
        return null;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v !== 'string')
        return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
}
// ── normalizeUtm ─────────────────────────────────────────────────────────────
/**
 * Apply the full Phase-A normalization + validation pipeline.
 *
 * Order:
 *   1. Coerce + trim each field.
 *   2. utm_source: lowercase → Snag-code rollup (no violation) → UA reject
 *      (violation + null) → allow-list check (violation + null if not).
 *   3. utm_medium: lowercase → allow-list check (violation + null if not).
 *   4. utm_campaign: lowercase pre-applied → flag format violation but keep
 *      value (Phase A is lenient on campaigns).
 *   5. utm_content / utm_term: lowercase pre-applied; pass through unchanged.
 */
async function normalizeUtm(raw, _evidence) {
    const violations = [];
    const rawSource = coerce(raw.source);
    const rawMedium = coerce(raw.medium);
    const rawCampaign = coerce(raw.campaign);
    const rawContent = coerce(raw.content);
    const rawTerm = coerce(raw.term);
    // ── utm_source ──
    let source = null;
    if (rawSource !== null) {
        // Snag code pattern wins BEFORE lowercasing (pattern is case-insensitive),
        // because the rolled-up value is the approved 'snag-referrals'.
        if (SNAG_CODE_PATTERN.test(rawSource)) {
            source = exports.SNAG_ROLLUP_SOURCE;
        }
        else {
            const lower = rawSource.toLowerCase();
            if (BROWSER_UA_SOURCES.has(lower)) {
                violations.push({
                    field: 'utm_source',
                    rejectedValue: rawSource,
                    reason: 'user-agent',
                });
            }
            else {
                const approved = await loadApprovedSources();
                if (approved.has(lower)) {
                    source = lower;
                }
                else {
                    violations.push({
                        field: 'utm_source',
                        rejectedValue: rawSource,
                        reason: 'not-on-approved-list',
                    });
                }
            }
        }
    }
    // ── utm_medium ──
    let medium = null;
    if (rawMedium !== null) {
        const lower = rawMedium.toLowerCase();
        const approved = await loadApprovedMediums();
        if (approved.has(lower)) {
            medium = lower;
        }
        else {
            violations.push({
                field: 'utm_medium',
                rejectedValue: rawMedium,
                reason: 'not-on-approved-list',
            });
        }
    }
    // ── utm_campaign ──
    // Phase A: don't auto-normalize underscores to hyphens; flag in a follow-up.
    // Just lowercase + pass through. Format violation is recorded but doesn't
    // null the value out (campaigns are open-ended).
    let campaign = null;
    if (rawCampaign !== null) {
        const lower = rawCampaign.toLowerCase();
        if (!CAMPAIGN_PATTERN.test(lower)) {
            violations.push({
                field: 'utm_campaign',
                rejectedValue: rawCampaign,
                reason: 'format-violation',
            });
        }
        campaign = lower;
    }
    // ── utm_content + utm_term ──
    const content = rawContent !== null ? rawContent.toLowerCase() : null;
    const term = rawTerm !== null ? rawTerm.toLowerCase() : null;
    return { source, medium, campaign, content, term, violations };
}
// ── logViolations ────────────────────────────────────────────────────────────
/**
 * Persist a batch of violations to utm_violations as a SINGLE multi-row
 * INSERT — one round-trip instead of N, which matters on noisy landing URLs
 * that emit 3+ violations per request.
 *
 * Best-effort: failures are logged to console but never thrown — UTM logging
 * must never break the user-facing landing flow.
 */
async function logViolations(violations, evidence, profileId = null) {
    if (violations.length === 0)
        return;
    try {
        const values = [];
        const placeholders = [];
        let i = 1;
        for (const v of violations) {
            placeholders.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
            values.push(profileId, evidence.rawUrl, v.field, v.rejectedValue, v.reason, evidence.referrer ?? null, evidence.userAgent ?? null);
        }
        const sql = `
      INSERT INTO utm_violations
        (profile_id, raw_url, rejected_field, rejected_value, reason, raw_referrer, user_agent)
      VALUES ${placeholders.join(', ')}
    `;
        await (0, pool_1.execute)(sql, values);
    }
    catch (err) {
        // Don't throw — UTM observability must not break user flow.
        console.warn('[utmService] failed to log violations:', err);
    }
}
//# sourceMappingURL=utmService.js.map