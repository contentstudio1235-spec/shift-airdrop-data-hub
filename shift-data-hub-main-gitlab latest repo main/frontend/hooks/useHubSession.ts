"use client";
// ============================================================
// useHubSession — Phase 1 Hub-Trust telemetry hook
//
// Mounts a single session for the Data Hub root. Every child can read the
// sessionId + emit telemetry events via `useHubSession()`.
//
// Lifecycle:
//   - On mount: generate UUID v4, POST /api/hub-trust/sessions
//   - While alive: queue + flush `recordEvent` calls (≥2s gap between flushes)
//   - On unmount OR `visibilitychange→hidden`: POST /sessions/:id/close
//
// Design constraints:
//   - Fire-and-forget — no awaiting in the render path
//   - No throwing — telemetry failures NEVER break the hub
//   - Single in-memory queue with setTimeout-based flush
// ============================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'ShiftRwa2026@@$$Key';

// Minimum gap between flushes (debounce). Backend-friendly.
const FLUSH_INTERVAL_MS = 2000;

// ── Event shapes ────────────────────────────────────────────

export type HubTelemetryEventType =
  | 'tab_open'
  | 'tab_close'
  | 'card_click'
  | 'filter_change'
  | 'drill_down'
  | 'answer_reached'
  | 'flag_filed';

export interface HubTelemetryEventOpts {
  tab?: string;
  metadata?: Record<string, unknown>;
}

interface QueuedEvent {
  sessionId: string;
  eventType: HubTelemetryEventType;
  tab?: string;
  metadata?: Record<string, unknown>;
}

// ── Context value ───────────────────────────────────────────

export interface HubSessionContextValue {
  sessionId: string | null;
  recordEvent: (type: HubTelemetryEventType, opts?: HubTelemetryEventOpts) => void;
}

const HubSessionContext = createContext<HubSessionContextValue>({
  sessionId: null,
  recordEvent: () => {
    /* no-op when no provider — telemetry is best-effort */
  },
});

// ── Utility: best-effort POST that never throws ─────────────

function bestEffortPost(path: string, body: unknown): void {
  try {
    void fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true, // survives page-unload
    }).catch(() => {
      /* swallow — telemetry must never bubble */
    });
  } catch {
    /* swallow synchronous failures too */
  }
}

// ── Provider component ─────────────────────────────────────

interface HubSessionProviderProps {
  /**
   * Initial view from the URL (e.g. `pulse`). Sent verbatim to /sessions on
   * mount as `initialView`. Falls back to 'pulse' when null/undefined.
   */
  initialView?: string | null;
  /** Optional role label — Phase 1 we hard-code 'unknown'. */
  hubRole?: string;
  children: React.ReactNode;
}

/**
 * HubSessionProvider — mounts ONCE at the Data Hub root. Subsequent renders
 * keep the same session UUID. Child components subscribe via useHubSession().
 */
export function HubSessionProvider({
  initialView,
  hubRole = 'unknown',
  children,
}: HubSessionProviderProps) {
  // sessionId is created exactly once, client-side. Never recomputed.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const closedRef = useRef(false);
  const queueRef = useRef<QueuedEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushAtRef = useRef<number>(0);

  // Mount — generate UUID + open session.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // crypto.randomUUID is available in all modern evergreen browsers.
    const id =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : // Cheap fallback — RFC4122-ish, sufficient for telemetry correlation only.
          `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random()
            .toString(16)
            .slice(2, 10)}`;
    setSessionId(id);

    bestEffortPost('/api/hub-trust/sessions', {
      sessionId: id,
      userAgent: navigator.userAgent,
      hubRole,
      initialView: initialView ?? 'pulse',
    });

    const closeSession = () => {
      if (closedRef.current || !id) return;
      closedRef.current = true;
      bestEffortPost(`/api/hub-trust/sessions/${id}/close`, {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') closeSession();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', closeSession);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', closeSession);
      closeSession();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
    // Intentionally empty deps — session must outlive prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flush logic ─────────────────────────────────────────
  // Drain the queue into N parallel POSTs. Cheap; backend is the rate-limiter.
  const flushQueue = useCallback(() => {
    flushTimerRef.current = null;
    const queue = queueRef.current;
    if (queue.length === 0) return;
    queueRef.current = [];
    lastFlushAtRef.current = Date.now();
    for (const ev of queue) {
      bestEffortPost('/api/hub-trust/events', ev);
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return; // already pending
    const sinceLast = Date.now() - lastFlushAtRef.current;
    const wait = Math.max(0, FLUSH_INTERVAL_MS - sinceLast);
    flushTimerRef.current = setTimeout(flushQueue, wait);
  }, [flushQueue]);

  // recordEvent — public API. Fire-and-forget; the queue absorbs spam.
  const recordEvent = useCallback(
    (type: HubTelemetryEventType, opts: HubTelemetryEventOpts = {}) => {
      if (!sessionId) return; // pre-mount events drop silently
      queueRef.current.push({
        sessionId,
        eventType: type,
        tab: opts.tab,
        metadata: opts.metadata,
      });
      scheduleFlush();
    },
    [sessionId, scheduleFlush],
  );

  const value = useMemo<HubSessionContextValue>(
    () => ({ sessionId, recordEvent }),
    [sessionId, recordEvent],
  );

  return React.createElement(HubSessionContext.Provider, { value }, children);
}

/**
 * useHubSession — subscribe to the current session + emit telemetry events.
 *
 * Safe to call from anywhere under <HubSessionProvider>. Outside the provider
 * returns `{ sessionId: null, recordEvent: noop }` so consumers don't need to
 * branch.
 */
export function useHubSession(): HubSessionContextValue {
  return useContext(HubSessionContext);
}
