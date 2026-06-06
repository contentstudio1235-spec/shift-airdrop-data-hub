# Phase 1 fast-follows (Code Reviewer findings, deferred to Phase 1.5)

Two IMPORTANT items from the Phase 1 trust-floor review that ship as separate small PRs.

## FF-1 — useActiveIncidents shared subscription (IMP-4)

**Current state:** Each `IncidentBannerWrapper` instance calls `useActiveIncidents()` independently and sets up its own 30s `setInterval`. On Pulse with 6 KPI cards = 12 reqs/min from one tab open. With Phase 1.5 wiring dozens of cells, this becomes a real load problem and risks colliding with the 500-events/min rate limiter.

**Fix:** Lift `useActiveIncidents` into a context provider at the data-hub root. One poller for the whole subtree; each wrapper subscribes via context.

**Effort:** S. One new provider + replace `useActiveIncidents()` call sites with `useContext(IncidentsContext)`.

## FF-2 — Telemetry rate-limiter map eviction (IMP-3)

**Current state:** `src/services/hubTelemetryService.ts:70-86` keeps `rateBuckets: Map<sessionId, RateBucket>` that never evicts entries. Per-session count resets within the 60s window, but the map entry sits forever. ~50 bytes/entry × ~1000 sessions/day = ~18MB/year unbounded growth.

**Fix:** Lazy eviction during `checkRateLimit` — when touching a stale bucket, opportunistically iterate and drop other entries whose `windowStart` is >5 minutes old. Or a 5-min `setInterval` sweep.

**Effort:** XS. ~10 lines.

---

Both are non-urgent and don't block Phase 2. Add to next session's pending list.
