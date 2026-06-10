"use strict";
// ============================================================
// hubTelemetryService — Hub session + event capture (Phase 1)
// ============================================================
// Three responsibilities:
//   1. startSession   — idempotent INSERT on session_id (frontend retries
//                       a network-failed POST won't create a duplicate row)
//   2. recordEvent    — append-only INSERT into hub_events, with an
//                       in-memory rate limiter capped at 500 events/min/session
//                       to protect against runaway frontend loops
//   3. closeSession   — sets closed_at; idempotent
//
// The frontend instruments itself; backend is purely the receiver.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHubEventType = isHubEventType;
exports._resetRateLimiter = _resetRateLimiter;
exports.startSession = startSession;
exports.recordEvent = recordEvent;
exports.closeSession = closeSession;
const pool_1 = require("../db/pool");
const VALID_EVENT_TYPES = new Set([
    'tab_open',
    'tab_close',
    'card_click',
    'filter_change',
    'drill_down',
    'answer_reached',
    'flag_filed',
]);
function isHubEventType(input) {
    return typeof input === 'string' && VALID_EVENT_TYPES.has(input);
}
// ── Rate limiter ─────────────────────────────────────────────────────────────
// In-memory sliding window — 500 events per rolling minute per session.
// Protects against a runaway frontend loop hammering the events endpoint.
// On process restart the window resets which is fine — this is a soft cap,
// not a security boundary.
const RATE_LIMIT_PER_MINUTE = 500;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map();
function checkRateLimit(sessionId) {
    const now = Date.now();
    const bucket = rateBuckets.get(sessionId);
    if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
        rateBuckets.set(sessionId, { windowStart: now, count: 1 });
        return true;
    }
    bucket.count += 1;
    return bucket.count <= RATE_LIMIT_PER_MINUTE;
}
// Exposed for tests + cron-style cleanup if ever needed.
function _resetRateLimiter() {
    rateBuckets.clear();
}
// ── Service functions ───────────────────────────────────────────────────────
/**
 * Idempotent INSERT keyed on session_id. ON CONFLICT updates last_seen_at +
 * user_agent + hub_role + initial_view so a stale-session retry from the
 * frontend (e.g. after a 5xx) just freshens the row rather than blowing up.
 */
async function startSession(input) {
    const { sessionId, userAgent, hubRole, initialView } = input;
    await (0, pool_1.execute)(`
    INSERT INTO hub_sessions (session_id, user_agent, hub_role, initial_view, last_seen_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (session_id) DO UPDATE SET
      last_seen_at = NOW(),
      user_agent   = COALESCE(EXCLUDED.user_agent, hub_sessions.user_agent),
      hub_role     = COALESCE(EXCLUDED.hub_role, hub_sessions.hub_role),
      initial_view = COALESCE(EXCLUDED.initial_view, hub_sessions.initial_view)
    `, [sessionId, userAgent ?? null, hubRole ?? null, initialView ?? null]);
}
/**
 * Append-only INSERT into hub_events. Returns true if recorded, false if the
 * session breached the per-minute rate cap (caller logs + returns 201
 * anyway — telemetry must never break the user flow).
 */
async function recordEvent(input) {
    const { sessionId, eventType, tab, metadata } = input;
    if (!checkRateLimit(sessionId)) {
        console.warn(`[hubTelemetry] rate limit hit for session ${sessionId} — dropping event ${eventType}`);
        return false;
    }
    // Verify the session exists; if not, the frontend skipped startSession.
    // Create a stub row so the FK on hub_events doesn't fail.
    const existing = await (0, pool_1.queryOne)(`SELECT id FROM hub_sessions WHERE session_id = $1`, [sessionId]);
    if (!existing) {
        await (0, pool_1.execute)(`
      INSERT INTO hub_sessions (session_id, last_seen_at)
      VALUES ($1, NOW())
      ON CONFLICT (session_id) DO NOTHING
      `, [sessionId]);
    }
    else {
        await (0, pool_1.execute)(`UPDATE hub_sessions SET last_seen_at = NOW() WHERE session_id = $1`, [sessionId]);
    }
    await (0, pool_1.execute)(`
    INSERT INTO hub_events (session_id, event_type, tab, metadata)
    VALUES ($1, $2, $3, $4::jsonb)
    `, [sessionId, eventType, tab ?? null, metadata ? JSON.stringify(metadata) : null]);
    return true;
}
/** Idempotent close — multiple calls just refresh closed_at. */
async function closeSession(sessionId) {
    await (0, pool_1.execute)(`
    UPDATE hub_sessions
    SET closed_at = NOW(), last_seen_at = NOW()
    WHERE session_id = $1
    `, [sessionId]);
}
//# sourceMappingURL=hubTelemetryService.js.map