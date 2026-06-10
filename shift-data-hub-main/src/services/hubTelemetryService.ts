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

import { execute, queryOne } from '../db/pool';

// ── Types ────────────────────────────────────────────────────────────────────

export type HubEventType =
  | 'tab_open'
  | 'tab_close'
  | 'card_click'
  | 'filter_change'
  | 'drill_down'
  | 'answer_reached'
  | 'flag_filed';

const VALID_EVENT_TYPES: ReadonlySet<HubEventType> = new Set([
  'tab_open',
  'tab_close',
  'card_click',
  'filter_change',
  'drill_down',
  'answer_reached',
  'flag_filed',
]);

export function isHubEventType(input: unknown): input is HubEventType {
  return typeof input === 'string' && VALID_EVENT_TYPES.has(input as HubEventType);
}

export interface StartSessionInput {
  sessionId: string;
  userAgent?: string | null;
  hubRole?: string | null;
  initialView?: string | null;
}

export interface RecordEventInput {
  sessionId: string;
  eventType: HubEventType;
  tab?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ── Rate limiter ─────────────────────────────────────────────────────────────
// In-memory sliding window — 500 events per rolling minute per session.
// Protects against a runaway frontend loop hammering the events endpoint.
// On process restart the window resets which is fine — this is a soft cap,
// not a security boundary.

const RATE_LIMIT_PER_MINUTE = 500;
const RATE_WINDOW_MS = 60_000;

interface RateBucket {
  windowStart: number;
  count: number;
}

const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(sessionId: string): boolean {
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
export function _resetRateLimiter(): void {
  rateBuckets.clear();
}

// ── Service functions ───────────────────────────────────────────────────────

/**
 * Idempotent INSERT keyed on session_id. ON CONFLICT updates last_seen_at +
 * user_agent + hub_role + initial_view so a stale-session retry from the
 * frontend (e.g. after a 5xx) just freshens the row rather than blowing up.
 */
export async function startSession(input: StartSessionInput): Promise<void> {
  const { sessionId, userAgent, hubRole, initialView } = input;
  await execute(
    `
    INSERT INTO hub_sessions (session_id, user_agent, hub_role, initial_view, last_seen_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (session_id) DO UPDATE SET
      last_seen_at = NOW(),
      user_agent   = COALESCE(EXCLUDED.user_agent, hub_sessions.user_agent),
      hub_role     = COALESCE(EXCLUDED.hub_role, hub_sessions.hub_role),
      initial_view = COALESCE(EXCLUDED.initial_view, hub_sessions.initial_view)
    `,
    [sessionId, userAgent ?? null, hubRole ?? null, initialView ?? null],
  );
}

/**
 * Append-only INSERT into hub_events. Returns true if recorded, false if the
 * session breached the per-minute rate cap (caller logs + returns 201
 * anyway — telemetry must never break the user flow).
 */
export async function recordEvent(input: RecordEventInput): Promise<boolean> {
  const { sessionId, eventType, tab, metadata } = input;

  if (!checkRateLimit(sessionId)) {
    console.warn(`[hubTelemetry] rate limit hit for session ${sessionId} — dropping event ${eventType}`);
    return false;
  }

  // Verify the session exists; if not, the frontend skipped startSession.
  // Create a stub row so the FK on hub_events doesn't fail.
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM hub_sessions WHERE session_id = $1`,
    [sessionId],
  );
  if (!existing) {
    await execute(
      `
      INSERT INTO hub_sessions (session_id, last_seen_at)
      VALUES ($1, NOW())
      ON CONFLICT (session_id) DO NOTHING
      `,
      [sessionId],
    );
  } else {
    await execute(
      `UPDATE hub_sessions SET last_seen_at = NOW() WHERE session_id = $1`,
      [sessionId],
    );
  }

  await execute(
    `
    INSERT INTO hub_events (session_id, event_type, tab, metadata)
    VALUES ($1, $2, $3, $4::jsonb)
    `,
    [sessionId, eventType, tab ?? null, metadata ? JSON.stringify(metadata) : null],
  );
  return true;
}

/** Idempotent close — multiple calls just refresh closed_at. */
export async function closeSession(sessionId: string): Promise<void> {
  await execute(
    `
    UPDATE hub_sessions
    SET closed_at = NOW(), last_seen_at = NOW()
    WHERE session_id = $1
    `,
    [sessionId],
  );
}
