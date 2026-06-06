// ============================================================
// /api/hub-trust route — integration tests (Phase 1)
// ============================================================
// Locks the contract the frontend (and the sibling Frontend Developer)
// consumes:
//   - admin-key gate on all endpoints
//   - POST creates return BARE objects (no `{ flag: ... }` wrapper)
//   - GET lists return `{ flags: [...] }` / `{ incidents: [...] }` envelopes
//   - every JSON key is camelCase
//   - validation errors return { error: 'snake_case_reason' } with 400
//
// DB pool + services are mocked so these are pure HTTP contract tests.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Hoisted mocks. The route imports services; we stub them to make assertions
// pure and reset between tests.
vi.mock('../../db/pool', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn().mockResolvedValue(1),
  pool: {} as any,
}));

vi.mock('../../services/hubTelemetryService', async () => {
  const actual = await vi.importActual<typeof import('../../services/hubTelemetryService')>(
    '../../services/hubTelemetryService',
  );
  return {
    ...actual,
    startSession: vi.fn().mockResolvedValue(undefined),
    recordEvent: vi.fn().mockResolvedValue(true),
    closeSession: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../../services/hubFlagsService', async () => {
  const actual = await vi.importActual<typeof import('../../services/hubFlagsService')>(
    '../../services/hubFlagsService',
  );
  return {
    ...actual,
    fileFlag: vi.fn(),
    listFlags: vi.fn(),
    triageFlag: vi.fn(),
  };
});

vi.mock('../../services/hubIncidentsService', async () => {
  const actual = await vi.importActual<typeof import('../../services/hubIncidentsService')>(
    '../../services/hubIncidentsService',
  );
  return {
    ...actual,
    openIncident: vi.fn(),
    listActive: vi.fn(),
    resolveIncident: vi.fn(),
  };
});

import hubTrustRouter from '../hubTrust';
import * as telemetry from '../../services/hubTelemetryService';
import * as flagsSvc from '../../services/hubFlagsService';
import * as incidentsSvc from '../../services/hubIncidentsService';

const ADMIN_KEY = 'ShiftRwa2026@@$$Key';
const SESSION_ID = '11111111-2222-3333-4444-555555555555';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/hub-trust', hubTrustRouter);
  return app;
}

beforeEach(() => {
  vi.mocked(telemetry.startSession).mockClear();
  vi.mocked(telemetry.recordEvent).mockClear().mockResolvedValue(true);
  vi.mocked(telemetry.closeSession).mockClear();
  vi.mocked(flagsSvc.fileFlag).mockReset();
  vi.mocked(flagsSvc.listFlags).mockReset();
  vi.mocked(flagsSvc.triageFlag).mockReset();
  vi.mocked(incidentsSvc.openIncident).mockReset();
  vi.mocked(incidentsSvc.listActive).mockReset();
  vi.mocked(incidentsSvc.resolveIncident).mockReset();
});

// ── 1. Auth gate ────────────────────────────────────────────────────────────

describe('/api/hub-trust — auth gate', () => {
  it('returns 401 when x-admin-key header is missing', async () => {
    const res = await request(makeApp()).get('/api/hub-trust/incidents/active');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'unauthorized' });
  });

  it('returns 401 when x-admin-key is wrong', async () => {
    const res = await request(makeApp())
      .post('/api/hub-trust/flags')
      .set('x-admin-key', 'nope')
      .send({ tab: 'pulse', metricId: 'totalUsers' });
    expect(res.status).toBe(401);
  });
});

// ── 2. POST /sessions idempotent on sessionId ───────────────────────────────

describe('POST /api/hub-trust/sessions', () => {
  it('accepts a valid UUID sessionId and returns 201', async () => {
    const res = await request(makeApp())
      .post('/api/hub-trust/sessions')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        sessionId: SESSION_ID,
        hubRole: 'tomer',
        initialView: 'pulse',
        userAgent: 'Mozilla/5.0 (test)',
      });

    expect(res.status).toBe(201);
    expect(telemetry.startSession).toHaveBeenCalledTimes(1);
    expect(telemetry.startSession).toHaveBeenCalledWith({
      sessionId: SESSION_ID,
      userAgent: 'Mozilla/5.0 (test)',
      hubRole: 'tomer',
      initialView: 'pulse',
    });
  });

  it('is idempotent on sessionId (calling twice yields two 201s without throwing)', async () => {
    const body = { sessionId: SESSION_ID, hubRole: 'tomer', initialView: 'pulse' };
    const r1 = await request(makeApp())
      .post('/api/hub-trust/sessions')
      .set('x-admin-key', ADMIN_KEY)
      .send(body);
    const r2 = await request(makeApp())
      .post('/api/hub-trust/sessions')
      .set('x-admin-key', ADMIN_KEY)
      .send(body);

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(telemetry.startSession).toHaveBeenCalledTimes(2);
    // Real DB enforces idempotency via ON CONFLICT in the service SQL — that
    // SQL is exercised in the service unit tests; here we just prove the route
    // doesn't bounce duplicates with a 4xx.
  });

  it('rejects a non-UUID sessionId with 400', async () => {
    const res = await request(makeApp())
      .post('/api/hub-trust/sessions')
      .set('x-admin-key', ADMIN_KEY)
      .send({ sessionId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('sessionId_invalid');
  });
});

// ── 3. POST /events with invalid eventType → 400 ────────────────────────────

describe('POST /api/hub-trust/events', () => {
  it('rejects an unknown eventType with 400', async () => {
    const res = await request(makeApp())
      .post('/api/hub-trust/events')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        sessionId: SESSION_ID,
        eventType: 'definitely_not_a_real_event',
        tab: 'pulse',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('eventType_invalid');
    expect(telemetry.recordEvent).not.toHaveBeenCalled();
  });

  it('records a valid event and returns 201 { recorded: true }', async () => {
    const res = await request(makeApp())
      .post('/api/hub-trust/events')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        sessionId: SESSION_ID,
        eventType: 'tab_open',
        tab: 'pulse',
        metadata: { from: 'landing' },
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ recorded: true });
    expect(telemetry.recordEvent).toHaveBeenCalledWith({
      sessionId: SESSION_ID,
      eventType: 'tab_open',
      tab: 'pulse',
      metadata: { from: 'landing' },
    });
  });
});

// ── 4. POST /flags validation -- tab + metricId required ────────────────────

describe('POST /api/hub-trust/flags — validation', () => {
  it('returns 400 with error: tab_required when tab missing', async () => {
    const res = await request(makeApp())
      .post('/api/hub-trust/flags')
      .set('x-admin-key', ADMIN_KEY)
      .send({ metricId: 'totalUsers' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('tab_required');
    expect(flagsSvc.fileFlag).not.toHaveBeenCalled();
  });

  it('returns 400 with error: metricId_required when metricId missing', async () => {
    const res = await request(makeApp())
      .post('/api/hub-trust/flags')
      .set('x-admin-key', ADMIN_KEY)
      .send({ tab: 'pulse' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('metricId_required');
  });
});

// ── 5. POST /flags persists + returns camelCase HubFlag ─────────────────────

describe('POST /api/hub-trust/flags — happy path', () => {
  const flagRow = {
    id: 7,
    flaggedAt: '2026-06-06T14:00:00.000Z',
    sessionId: SESSION_ID,
    hubRole: 'tomer',
    tab: 'pulse',
    metricId: 'totalUsers',
    displayedValue: '15,455',
    asOf: '2026-06-06T13:55:00.000Z',
    comment: 'looks 7x too high',
    status: 'open' as const,
    triagedAt: null,
    triagedBy: null,
    resolutionNote: null,
    incidentId: null,
  };

  it('persists the flag and returns the bare camelCase HubFlag on 201', async () => {
    vi.mocked(flagsSvc.fileFlag).mockResolvedValueOnce(flagRow);

    const res = await request(makeApp())
      .post('/api/hub-trust/flags')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        sessionId: SESSION_ID,
        hubRole: 'tomer',
        tab: 'pulse',
        metricId: 'totalUsers',
        displayedValue: '15,455',
        asOf: '2026-06-06T13:55:00.000Z',
        comment: 'looks 7x too high',
      });

    expect(res.status).toBe(201);
    // BARE object — NOT wrapped in { flag }.
    expect(res.body).not.toHaveProperty('flag');
    expect(res.body).toEqual(flagRow);
    // Spot-check camelCase keys explicitly.
    expect(res.body.flaggedAt).toBe('2026-06-06T14:00:00.000Z');
    expect(res.body.metricId).toBe('totalUsers');
    expect(res.body.displayedValue).toBe('15,455');
    expect(res.body.asOf).toBe('2026-06-06T13:55:00.000Z');
    expect(res.body.hubRole).toBe('tomer');
    expect(res.body.incidentId).toBeNull();
    // And NO snake_case keys leaked.
    expect(res.body).not.toHaveProperty('flagged_at');
    expect(res.body).not.toHaveProperty('metric_id');
    expect(res.body).not.toHaveProperty('displayed_value');
    expect(res.body).not.toHaveProperty('incident_id');
  });
});

// ── 6. GET /flags?status=open returns envelope + camelCase ──────────────────

describe('GET /api/hub-trust/flags', () => {
  it('returns { flags: [...] } envelope with camelCase rows when filtered by status', async () => {
    const rows = [
      {
        id: 1,
        flaggedAt: '2026-06-06T14:00:00.000Z',
        sessionId: SESSION_ID,
        hubRole: 'tomer',
        tab: 'pulse',
        metricId: 'totalUsers',
        displayedValue: '15,455',
        asOf: '2026-06-06T13:55:00.000Z',
        comment: 'high',
        status: 'open' as const,
        triagedAt: null,
        triagedBy: null,
        resolutionNote: null,
        incidentId: null,
      },
    ];
    vi.mocked(flagsSvc.listFlags).mockResolvedValueOnce(rows);

    const res = await request(makeApp())
      .get('/api/hub-trust/flags?status=open&limit=10')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('flags');
    expect(res.body).not.toHaveProperty('rows');
    expect(Array.isArray(res.body.flags)).toBe(true);
    expect(res.body.flags[0].flaggedAt).toBe('2026-06-06T14:00:00.000Z');
    expect(res.body.flags[0].metricId).toBe('totalUsers');

    // listFlags was called with the filter parsed from the query string.
    expect(flagsSvc.listFlags).toHaveBeenCalledWith({
      status: 'open',
      sinceISO: null,
      limit: 10,
    });
  });
});

// ── 7. GET /incidents/active returns only unresolved ────────────────────────

describe('GET /api/hub-trust/incidents/active', () => {
  it('returns { incidents: [...] } envelope sourced from listActive()', async () => {
    const activeIncident = {
      id: 4,
      openedAt: '2026-06-06T13:00:00.000Z',
      openedBy: 'triage:tomer',
      severity: 'P0' as const,
      affectedTabs: ['pulse', 'users'],
      affectedMetric: 'totalUsers',
      hypothesis: 'row multiplication on join',
      resolvedAt: null,
      resolution: null,
      fixCommitSha: null,
    };
    vi.mocked(incidentsSvc.listActive).mockResolvedValueOnce([activeIncident]);

    const res = await request(makeApp())
      .get('/api/hub-trust/incidents/active')
      .set('x-admin-key', ADMIN_KEY);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('incidents');
    expect(Array.isArray(res.body.incidents)).toBe(true);
    expect(res.body.incidents).toHaveLength(1);

    const row = res.body.incidents[0];
    expect(row.severity).toBe('P0');
    expect(row.affectedTabs).toEqual(['pulse', 'users']);
    expect(row.affectedMetric).toBe('totalUsers');
    expect(row.resolvedAt).toBeNull();
    expect(row.openedBy).toBe('triage:tomer');
    expect(row.fixCommitSha).toBeNull();
    // No snake_case leakage.
    expect(row).not.toHaveProperty('opened_at');
    expect(row).not.toHaveProperty('affected_tabs');
    expect(row).not.toHaveProperty('fix_commit_sha');

    // The listActive() service is the one responsible for the
    // `WHERE resolved_at IS NULL` filter — the route only envelopes.
    expect(incidentsSvc.listActive).toHaveBeenCalledTimes(1);
  });
});

// ── 8. PATCH /incidents/:id/resolve sets resolvedAt + resolution ────────────

describe('PATCH /api/hub-trust/incidents/:id/resolve', () => {
  it('returns the resolved incident with resolvedAt and resolution populated', async () => {
    const resolved = {
      id: 4,
      openedAt: '2026-06-06T13:00:00.000Z',
      openedBy: 'triage:tomer',
      severity: 'P0' as const,
      affectedTabs: ['pulse'],
      affectedMetric: 'totalUsers',
      hypothesis: 'row multiplication',
      resolvedAt: '2026-06-06T15:30:00.000Z',
      resolution: 'fixed' as const,
      fixCommitSha: 'abc1234',
    };
    vi.mocked(incidentsSvc.resolveIncident).mockResolvedValueOnce(resolved);

    const res = await request(makeApp())
      .patch('/api/hub-trust/incidents/4/resolve')
      .set('x-admin-key', ADMIN_KEY)
      .send({ resolution: 'fixed', fixCommitSha: 'abc1234' });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('incident');
    expect(res.body.resolvedAt).toBe('2026-06-06T15:30:00.000Z');
    expect(res.body.resolution).toBe('fixed');
    expect(res.body.fixCommitSha).toBe('abc1234');
    expect(incidentsSvc.resolveIncident).toHaveBeenCalledWith(4, {
      resolution: 'fixed',
      fixCommitSha: 'abc1234',
    });
  });

  it('rejects an invalid resolution value with 400', async () => {
    const res = await request(makeApp())
      .patch('/api/hub-trust/incidents/4/resolve')
      .set('x-admin-key', ADMIN_KEY)
      .send({ resolution: 'totally_made_up' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('resolution_invalid');
    expect(incidentsSvc.resolveIncident).not.toHaveBeenCalled();
  });

  it('returns 404 when the incident does not exist', async () => {
    vi.mocked(incidentsSvc.resolveIncident).mockResolvedValueOnce(null);
    const res = await request(makeApp())
      .patch('/api/hub-trust/incidents/999/resolve')
      .set('x-admin-key', ADMIN_KEY)
      .send({ resolution: 'fixed' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('incident_not_found');
  });
});

// ── 9. Integration: file flag -> triage -> link to incident ─────────────────

describe('integration: flag -> triage -> incident link', () => {
  it('POST flag, PATCH it to triaging, open an incident, then PATCH again with incidentId', async () => {
    // Step 1: POST a flag -- bare HubFlag returned.
    const filed = {
      id: 11,
      flaggedAt: '2026-06-06T14:00:00.000Z',
      sessionId: SESSION_ID,
      hubRole: 'tomer',
      tab: 'pulse',
      metricId: 'totalUsers',
      displayedValue: '15,455',
      asOf: '2026-06-06T13:55:00.000Z',
      comment: 'looks wrong',
      status: 'open' as const,
      triagedAt: null,
      triagedBy: null,
      resolutionNote: null,
      incidentId: null,
    };
    vi.mocked(flagsSvc.fileFlag).mockResolvedValueOnce(filed);

    const postRes = await request(makeApp())
      .post('/api/hub-trust/flags')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        sessionId: SESSION_ID,
        hubRole: 'tomer',
        tab: 'pulse',
        metricId: 'totalUsers',
        displayedValue: '15,455',
        asOf: '2026-06-06T13:55:00.000Z',
        comment: 'looks wrong',
      });
    expect(postRes.status).toBe(201);
    expect(postRes.body.id).toBe(11);
    expect(postRes.body.status).toBe('open');

    // Step 2: PATCH the flag to triaging.
    const triaging = {
      ...filed,
      status: 'triaging' as const,
      triagedAt: '2026-06-06T14:10:00.000Z',
      triagedBy: 'tomer',
    };
    vi.mocked(flagsSvc.triageFlag).mockResolvedValueOnce(triaging);

    const patchRes = await request(makeApp())
      .patch('/api/hub-trust/flags/11')
      .set('x-admin-key', ADMIN_KEY)
      .send({ status: 'triaging', triagedBy: 'tomer' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe('triaging');
    expect(patchRes.body.triagedBy).toBe('tomer');
    expect(flagsSvc.triageFlag).toHaveBeenCalledWith(11, {
      status: 'triaging',
      triagedBy: 'tomer',
      resolutionNote: null,
      incidentId: null,
    });

    // Step 3: open an incident for that metric.
    const incident = {
      id: 42,
      openedAt: '2026-06-06T14:15:00.000Z',
      openedBy: 'triage:tomer',
      severity: 'P0' as const,
      affectedTabs: ['pulse'],
      affectedMetric: 'totalUsers',
      hypothesis: 'row multiplication',
      resolvedAt: null,
      resolution: null,
      fixCommitSha: null,
    };
    vi.mocked(incidentsSvc.openIncident).mockResolvedValueOnce(incident);

    const incRes = await request(makeApp())
      .post('/api/hub-trust/incidents')
      .set('x-admin-key', ADMIN_KEY)
      .send({
        openedBy: 'triage:tomer',
        severity: 'P0',
        affectedTabs: ['pulse'],
        affectedMetric: 'totalUsers',
        hypothesis: 'row multiplication',
      });
    expect(incRes.status).toBe(201);
    expect(incRes.body.id).toBe(42);
    expect(incRes.body.affectedTabs).toEqual(['pulse']);

    // Step 4: PATCH the flag again, linking it to the incident.
    const linked = { ...triaging, incidentId: 42 };
    vi.mocked(flagsSvc.triageFlag).mockResolvedValueOnce(linked);

    const linkRes = await request(makeApp())
      .patch('/api/hub-trust/flags/11')
      .set('x-admin-key', ADMIN_KEY)
      .send({ status: 'triaging', triagedBy: 'tomer', incidentId: 42 });
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.incidentId).toBe(42);
    // Verify the service was called with the incidentId parsed as a number.
    expect(flagsSvc.triageFlag).toHaveBeenLastCalledWith(11, {
      status: 'triaging',
      triagedBy: 'tomer',
      resolutionNote: null,
      incidentId: 42,
    });
  });
});
