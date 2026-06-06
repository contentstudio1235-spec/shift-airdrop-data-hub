"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHubIncidentSeverity = isHubIncidentSeverity;
exports.isHubIncidentResolution = isHubIncidentResolution;
exports.openIncident = openIncident;
exports.listActive = listActive;
exports.resolveIncident = resolveIncident;
const pool_1 = require("../db/pool");
const VALID_SEVERITIES = new Set(['P0', 'P1', 'P2']);
function isHubIncidentSeverity(input) {
    return typeof input === 'string' && VALID_SEVERITIES.has(input);
}
const VALID_RESOLUTIONS = new Set([
    'fixed',
    'data_correct',
    'delayed',
    'wont_fix',
]);
function isHubIncidentResolution(input) {
    return typeof input === 'string' && VALID_RESOLUTIONS.has(input);
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
async function openIncident(input) {
    const row = await (0, pool_1.queryOne)(`
    INSERT INTO hub_incidents (
      opened_by, severity, affected_tabs, affected_metric, hypothesis
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${INCIDENT_SELECT_COLUMNS}
    `, [
        input.openedBy,
        input.severity,
        input.affectedTabs,
        input.affectedMetric,
        input.hypothesis ?? null,
    ]);
    if (!row) {
        throw new Error('openIncident: INSERT did not return a row');
    }
    return row;
}
/** Returns only unresolved incidents (resolved_at IS NULL). Drives the banner. */
async function listActive() {
    return (0, pool_1.query)(`
    SELECT ${INCIDENT_SELECT_COLUMNS}
    FROM hub_incidents
    WHERE resolved_at IS NULL
    ORDER BY opened_at DESC
    `);
}
async function resolveIncident(id, input) {
    return (0, pool_1.queryOne)(`
    UPDATE hub_incidents
    SET resolved_at    = NOW(),
        resolution     = $2,
        fix_commit_sha = COALESCE($3, fix_commit_sha)
    WHERE id = $1
    RETURNING ${INCIDENT_SELECT_COLUMNS}
    `, [id, input.resolution, input.fixCommitSha ?? null]);
}
//# sourceMappingURL=hubIncidentsService.js.map