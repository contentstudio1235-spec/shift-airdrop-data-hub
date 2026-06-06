export type HubEventType = 'tab_open' | 'tab_close' | 'card_click' | 'filter_change' | 'drill_down' | 'answer_reached' | 'flag_filed';
export declare function isHubEventType(input: unknown): input is HubEventType;
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
export declare function _resetRateLimiter(): void;
/**
 * Idempotent INSERT keyed on session_id. ON CONFLICT updates last_seen_at +
 * user_agent + hub_role + initial_view so a stale-session retry from the
 * frontend (e.g. after a 5xx) just freshens the row rather than blowing up.
 */
export declare function startSession(input: StartSessionInput): Promise<void>;
/**
 * Append-only INSERT into hub_events. Returns true if recorded, false if the
 * session breached the per-minute rate cap (caller logs + returns 201
 * anyway — telemetry must never break the user flow).
 */
export declare function recordEvent(input: RecordEventInput): Promise<boolean>;
/** Idempotent close — multiple calls just refresh closed_at. */
export declare function closeSession(sessionId: string): Promise<void>;
//# sourceMappingURL=hubTelemetryService.d.ts.map