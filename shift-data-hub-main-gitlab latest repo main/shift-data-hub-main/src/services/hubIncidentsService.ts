// ============================================================
// hubIncidentsService — Workflow 1 Node 3 ("Incident open") backend
// ============================================================
// Active Hub-wrong investigations. While a row has resolved_at IS NULL,
// the frontend renders an incident banner over the affected metric cells.
// Frontend polls /api/hub-trust/incidents/active every 30s for banner state.
//
// Contract (camelCase JSON shipped to frontend):
//   HubIncident {
//     id, openedAt, openedBy, severity, affectedTabs, affectedMetric,
//     hypothesis, resolvedAt, resolution, fixCommitSha
//   }
// ============================================================

import { query, queryOne } from '../db/pool';

// ── Types ────────────────────────────────────────────────────────────────────

export type HubIncidentSeverity = 'P0' | 'P1' | 'P2';

const VALID_SEVERITIES: ReadonlySet<HubIncidentSeverity> = new Set(['P0', 'P1', 'P2']);

export function isHubIncidentSeverity(input: unknown): input is HubIncidentSeverity {
  return typeof input === 'string' && VALID_SEVERITIES.has(input as HubIncidentSeverity);
}

export type HubIncidentResolution = 'fixed' | 'data_correct' | 'delayed' | 'wont_fix';

const VALID_RESOLUTIONS: ReadonlySet<HubIncidentResolution> = new Set([
  'fixed',
  'data_correct',
  'delayed',
  'wont_fix',
]);

export function isHubIncidentResolution(input: unknown): input is HubIncidentResolution {
  return typeof input === 'string' && VALID_RESOLUTIONS.has(input as HubIncidentResolution);
}

export interface HubIncident {
  id: number;
  openedAt: string;
  openedBy: string;
  severity: HubIncidentSeverity;
  affectedTabs: string[];
  affectedMetric: string;
  hypothesis: string | null;
  resolvedAt: string | null;
  resolution: HubIncidentResolution | null;
  fixCommitSha: string | null;
}

export interface OpenIncidentInput {
  openedBy: string;
  severity: HubIncidentSeverity;
  affectedTabs: string[];
  affectedMetric: string;
  hypothesis?: string | null;
}

export interface ResolveIncidentInput {
  resolution: HubIncidentResolution;
  fixCommitSha?: string | null;
}

// ── SELECT fragment (camelCase aliases — load-bearing) ──────────────────────

const INCIDENT_SELECT_COLUMNS = `
  id,
  opened_at       AS "openedAt",
  opened_by       AS "openedBy",
  severity,
  affected_tabs   AS "affectedTabs",
  affected_metric AS "affectedMetric",
  hypothesis,
  resolved_at     AS "resolvedAt",
  resolution,
  fix_commit_sha  AS "fixCommitSha"
`;

// ── Service functions ───────────────────────────────────────────────────────

export async function openIncident(input: OpenIncidentInput): Promise<HubIncident> {
  const row = await queryOne<HubIncident>(
    `
    INSERT INTO hub_incidents (
      opened_by, severity, affected_tabs, affected_metric, hypothesis
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${INCIDENT_SELECT_COLUMNS}
    `,
    [
      input.openedBy,
      input.severity,
      input.affectedTabs,
      input.affectedMetric,
      input.hypothesis ?? null,
    ],
  );
  if (!row) {
    throw new Error('openIncident: INSERT did not return a row');
  }
  return row;
}

/** Returns only unresolved incidents (resolved_at IS NULL). Drives the banner. */
export async function listActive(): Promise<HubIncident[]> {
  return query<HubIncident>(
    `
    SELECT ${INCIDENT_SELECT_COLUMNS}
    FROM hub_incidents
    WHERE resolved_at IS NULL
    ORDER BY opened_at DESC
    `,
  );
}

export async function resolveIncident(
  id: number,
  input: ResolveIncidentInput,
): Promise<HubIncident | null> {
  return queryOne<HubIncident>(
    `
    UPDATE hub_incidents
    SET resolved_at    = NOW(),
        resolution     = $2,
        fix_commit_sha = COALESCE($3, fix_commit_sha)
    WHERE id = $1
    RETURNING ${INCIDENT_SELECT_COLUMNS}
    `,
    [id, input.resolution, input.fixCommitSha ?? null],
  );
}
