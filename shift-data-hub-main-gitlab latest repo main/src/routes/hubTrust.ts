// ============================================================
// /api/hub-trust — Hub trust workflow endpoints (Phase 1)
// ============================================================
// Mounts:
//   Telemetry (frontend self-instrumentation):
//     POST   /sessions                       -- start (idempotent on sessionId)
//     POST   /events                         -- append an event
//     POST   /sessions/:id/close             -- mark closed
//
//   Flags (Workflow 1 Node 1: Discovery):
//     POST   /flags                          -- file a "this looks wrong" flag
//     GET    /flags?status=&since=&limit=    -- list, filtered
//     PATCH  /flags/:id                      -- triage (closed_correct etc.)
//
//   Incidents (Workflow 1 Node 3: Incident open):
//     GET    /incidents/active               -- frontend polls every 30s
//     POST   /incidents                      -- open new incident
//     PATCH  /incidents/:id/resolve          -- close with resolution
//
// All endpoints require `x-admin-key` (same shape as /api/utm, /api/users).
//
// ── CONTRACT NOTES (frontend consumer) ──
// 1. POST creates return the BARE object on 201 (not `{ flag: ... }`).
// 2. GET list responses use envelopes: `{ flags: [...] }` / `{ incidents: [...] }`.
// 3. Every JSON key is camelCase (see services/hub*Service.ts SELECT aliases).
// 4. validation errors return { error: 'snake_case_reason' } with status 400.
// ============================================================

import { Router, type Request, type Response } from 'express';
import { config } from '../config';
import {
  startSession,
  recordEvent,
  closeSession,
  isHubEventType,
} from '../services/hubTelemetryService';
import {
  fileFlag,
  listFlags,
  triageFlag,
  isHubFlagStatus,
  isHubFlagTriageStatus,
} from '../services/hubFlagsService';
import {
  openIncident,
  listActive,
  resolveIncident,
  isHubIncidentSeverity,
  isHubIncidentResolution,
} from '../services/hubIncidentsService';

const router = Router();

// ── Admin auth gate ─────────────────────────────────────────────────────────

router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asOptStr(v: unknown): string | null {
  const s = asStr(v);
  return s.length > 0 ? s : null;
}

function asStrArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    const s = asStr(item);
    if (!s) return null;
    out.push(s);
  }
  return out;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_PATTERN.test(v);
}

// ── Telemetry ───────────────────────────────────────────────────────────────

// POST /sessions -- body: { sessionId, userAgent?, hubRole?, initialView? }
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const body = asObject(req.body);
    const sessionId = asStr(body.sessionId);
    if (!isUuid(sessionId)) {
      return res.status(400).json({ error: 'sessionId_invalid' });
    }
    await startSession({
      sessionId,
      userAgent: asOptStr(body.userAgent) ?? req.header('user-agent') ?? null,
      hubRole: asOptStr(body.hubRole),
      initialView: asOptStr(body.initialView),
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[hub-trust/sessions]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /events -- body: { sessionId, eventType, tab?, metadata? }
router.post('/events', async (req: Request, res: Response) => {
  try {
    const body = asObject(req.body);
    const sessionId = asStr(body.sessionId);
    if (!isUuid(sessionId)) {
      return res.status(400).json({ error: 'sessionId_invalid' });
    }
    if (!isHubEventType(body.eventType)) {
      return res.status(400).json({ error: 'eventType_invalid' });
    }
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : null;

    const recorded = await recordEvent({
      sessionId,
      eventType: body.eventType,
      tab: asOptStr(body.tab),
      metadata,
    });
    // Always 201 even when rate-limited — telemetry must never break the user flow.
    res.status(201).json({ recorded });
  } catch (err) {
    console.error('[hub-trust/events]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /sessions/:id/close
router.post('/sessions/:id/close', async (req: Request, res: Response) => {
  try {
    const sessionId = asStr(req.params.id);
    if (!isUuid(sessionId)) {
      return res.status(400).json({ error: 'sessionId_invalid' });
    }
    await closeSession(sessionId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[hub-trust/sessions/close]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── Flags ───────────────────────────────────────────────────────────────────

// POST /flags -- body: { sessionId?, hubRole?, tab, metricId, displayedValue?, asOf?, comment? }
// 201: bare HubFlag
router.post('/flags', async (req: Request, res: Response) => {
  try {
    const body = asObject(req.body);

    const tab = asStr(body.tab);
    const metricId = asStr(body.metricId);
    if (!tab) {
      return res.status(400).json({ error: 'tab_required' });
    }
    if (!metricId) {
      return res.status(400).json({ error: 'metricId_required' });
    }

    const sessionIdRaw = asOptStr(body.sessionId);
    const sessionId = sessionIdRaw && isUuid(sessionIdRaw) ? sessionIdRaw : null;

    const asOfRaw = asOptStr(body.asOf);
    const asOf = asOfRaw && !Number.isNaN(Date.parse(asOfRaw)) ? asOfRaw : null;

    const flag = await fileFlag({
      sessionId,
      hubRole: asOptStr(body.hubRole),
      tab,
      metricId,
      displayedValue: asOptStr(body.displayedValue),
      asOf,
      comment: asOptStr(body.comment),
    });

    res.status(201).json(flag);
  } catch (err) {
    console.error('[hub-trust/flags/create]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /flags?status=&since=&limit=
// Response: { flags: HubFlag[] }
router.get('/flags', async (req: Request, res: Response) => {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : null;
    const status = statusRaw && isHubFlagStatus(statusRaw) ? statusRaw : null;

    const sinceRaw = typeof req.query.since === 'string' ? req.query.since : null;
    const sinceISO = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? sinceRaw : null;

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null;

    const flags = await listFlags({ status, sinceISO, limit });
    res.json({ flags });
  } catch (err) {
    console.error('[hub-trust/flags/list]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// PATCH /flags/:id -- body: { status, resolutionNote?, incidentId? }
// status must be one of: 'triaging' | 'closed_correct' | 'closed_delayed'
router.patch('/flags/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'id_invalid' });
    }
    const body = asObject(req.body);
    if (!isHubFlagTriageStatus(body.status)) {
      return res.status(400).json({ error: 'status_invalid' });
    }
    const triagedBy = asOptStr(body.triagedBy) ?? 'admin';

    const incidentIdRaw = body.incidentId;
    let incidentId: number | null = null;
    if (incidentIdRaw !== undefined && incidentIdRaw !== null) {
      const n = Number(incidentIdRaw);
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ error: 'incidentId_invalid' });
      }
      incidentId = Math.floor(n);
    }

    const updated = await triageFlag(id, {
      status: body.status,
      triagedBy,
      resolutionNote: asOptStr(body.resolutionNote),
      incidentId,
    });
    if (!updated) {
      return res.status(404).json({ error: 'flag_not_found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('[hub-trust/flags/triage]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── Incidents ───────────────────────────────────────────────────────────────

// GET /incidents/active -- frontend polls every 30s for banner state
// Response: { incidents: HubIncident[] }
router.get('/incidents/active', async (_req: Request, res: Response) => {
  try {
    const incidents = await listActive();
    res.json({ incidents });
  } catch (err) {
    console.error('[hub-trust/incidents/active]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// POST /incidents -- body: { openedBy, severity, affectedTabs, affectedMetric, hypothesis? }
// 201: bare HubIncident
router.post('/incidents', async (req: Request, res: Response) => {
  try {
    const body = asObject(req.body);

    const openedBy = asStr(body.openedBy);
    if (!openedBy) {
      return res.status(400).json({ error: 'openedBy_required' });
    }
    if (!isHubIncidentSeverity(body.severity)) {
      return res.status(400).json({ error: 'severity_invalid' });
    }
    const affectedTabs = asStrArray(body.affectedTabs);
    if (!affectedTabs || affectedTabs.length === 0) {
      return res.status(400).json({ error: 'affectedTabs_required' });
    }
    const affectedMetric = asStr(body.affectedMetric);
    if (!affectedMetric) {
      return res.status(400).json({ error: 'affectedMetric_required' });
    }

    const incident = await openIncident({
      openedBy,
      severity: body.severity,
      affectedTabs,
      affectedMetric,
      hypothesis: asOptStr(body.hypothesis),
    });
    res.status(201).json(incident);
  } catch (err) {
    console.error('[hub-trust/incidents/create]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// PATCH /incidents/:id/resolve -- body: { resolution, fixCommitSha? }
router.patch('/incidents/:id/resolve', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'id_invalid' });
    }
    const body = asObject(req.body);
    if (!isHubIncidentResolution(body.resolution)) {
      return res.status(400).json({ error: 'resolution_invalid' });
    }

    const updated = await resolveIncident(id, {
      resolution: body.resolution,
      fixCommitSha: asOptStr(body.fixCommitSha),
    });
    if (!updated) {
      return res.status(404).json({ error: 'incident_not_found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('[hub-trust/incidents/resolve]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
