"use strict";
// ============================================================
// utmCapture middleware — Phase A
// ============================================================
// Express middleware factory. Mounted BEFORE user-landing routes
// (/api/airdrop, /api/track, etc.). When the request carries any
// utm_* parameter — in EITHER the query string OR the JSON body — it:
//
//   1. Normalizes via utmService.normalizeUtm (lowercase, Snag rollup,
//      allow-list checks, UA-source reject).
//   2. Logs every rejected/normalized field to utm_violations (best-effort).
//   3. Stashes the normalized payload on req.utmNormalized for downstream
//      handlers (register, wallet_connect) to persist into user_profiles.
//
// Body wins over query when both are present — the frontend register flow
// sends UTMs in the POST body (no query string on POST /api/airdrop/register),
// so reading req.query alone would silently drop them on the floor.
//
// Purely additive: requests without UTMs are fast-pathed with a no-op.
// Failures never break the user flow — try/catch swallows DB errors.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.utmCapture = utmCapture;
const utmService_1 = require("../services/utmService");
/**
 * Defensive string coercion. Accepts:
 *   - bare string → trim, drop if empty
 *   - first element of a string[] (Express duplicates query keys as arrays)
 *   - anything else (number, object, null, undefined) → undefined
 */
function asString(v) {
    if (typeof v === 'string') {
        const t = v.trim();
        return t.length > 0 ? t : undefined;
    }
    if (Array.isArray(v) && typeof v[0] === 'string') {
        const t = v[0].trim();
        return t.length > 0 ? t : undefined;
    }
    return undefined;
}
/**
 * Pull a UTM field from body first, then query. Body wins — registrations
 * POST UTMs in the JSON body and never include them in the URL.
 */
function pickUtm(req, field) {
    const body = (req.body && typeof req.body === 'object' ? req.body : {});
    const queryObj = (req.query && typeof req.query === 'object' ? req.query : {});
    return asString(body[field]) ?? asString(queryObj[field]);
}
function utmCapture() {
    return async (req, _res, next) => {
        try {
            const raw = {
                source: pickUtm(req, 'utm_source'),
                medium: pickUtm(req, 'utm_medium'),
                campaign: pickUtm(req, 'utm_campaign'),
                content: pickUtm(req, 'utm_content'),
                term: pickUtm(req, 'utm_term'),
            };
            // Fast path: nothing to normalize.
            if (!raw.source && !raw.medium && !raw.campaign && !raw.content && !raw.term) {
                return next();
            }
            const evidence = {
                rawUrl: req.originalUrl,
                referrer: req.get('referer') ?? req.get('referrer') ?? null,
                userAgent: req.get('user-agent') ?? null,
            };
            const normalized = await (0, utmService_1.normalizeUtm)(raw, evidence);
            req.utmNormalized = normalized;
            // Best-effort violation logging; do NOT await success.
            if (normalized.violations.length > 0) {
                // Intentionally not awaited — failures are swallowed inside the service.
                void (0, utmService_1.logViolations)(normalized.violations, evidence, null);
            }
        }
        catch (err) {
            console.warn('[utmCapture] non-fatal middleware error:', err);
        }
        next();
    };
}
//# sourceMappingURL=utmCapture.js.map