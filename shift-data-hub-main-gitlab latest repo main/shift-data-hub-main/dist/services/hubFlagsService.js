"use strict";
// ============================================================
// hubFlagsService — Workflow 1 Node 1 ("Discovery") backend
// ============================================================
// File / list / triage the "this number looks wrong" reports that any
// numeric cell in the Hub can produce.
//
// Contract (camelCase JSON shipped to frontend):
//   HubFlag {
//     id, flaggedAt, sessionId, hubRole, tab, metricId,
//     displayedValue, asOf, comment, status,
//     triagedAt, triagedBy, resolutionNote, incidentId
//   }
//
// All SELECTs alias snake_case columns to camelCase via double-quoted
// Postgres identifiers -- the same pattern MR !17/!18 established.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHubFlagStatus = isHubFlagStatus;
exports.isHubFlagTriageStatus = isHubFlagTriageStatus;
exports.fileFlag = fileFlag;
exports.listFlags = listFlags;
exports.triageFlag = triageFlag;
const pool_1 = require("../db/pool");
const VALID_STATUSES = new Set([
    'open',
    'triaging',
    'closed_correct',
    'closed_delayed',
    'closed_fixed',
]);
function isHubFlagStatus(input) {
    return typeof input === 'string' && VALID_STATUSES.has(input);
}
const VALID_TRIAGE_STATUSES = new Set([
    'triaging',
    'closed_correct',
    'closed_delayed',
]);
function isHubFlagTriageStatus(input) {
    return typeof input === 'string' && VALID_TRIAGE_STATUSES.has(input);
}
// ── SELECT fragment (camelCase aliases — load-bearing) ──────────────────────
const FLAG_SELECT_COLUMNS = `
  id,
  flagged_at      AS "flaggedAt",
  session_id      AS "sessionId",
  hub_role        AS "hubRole",
  tab,
  metric_id       AS "metricId",
  displayed_value AS "displayedValue",
  as_of           AS "asOf",
  comment,
  status,
  triaged_at      AS "triagedAt",
  triaged_by      AS "triagedBy",
  resolution_note AS "resolutionNote",
  incident_id     AS "incidentId"
`;
// ── Service functions ───────────────────────────────────────────────────────
async function fileFlag(input) {
    const row = await (0, pool_1.queryOne)(`
    INSERT INTO hub_flags (
      session_id, hub_role, tab, metric_id, displayed_value, as_of, comment
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${FLAG_SELECT_COLUMNS}
    `, [
        input.sessionId ?? null,
        input.hubRole ?? null,
        input.tab,
        input.metricId,
        input.displayedValue ?? null,
        input.asOf ?? null,
        input.comment ?? null,
    ]);
    // queryOne returns null only if no row was returned -- INSERT ... RETURNING
    // always returns a row on success, so this is unreachable in practice.
    if (!row) {
        throw new Error('fileFlag: INSERT did not return a row');
    }
    return row;
}
async function listFlags(filter = {}) {
    const params = [];
    const whereClauses = [];
    if (filter.status) {
        params.push(filter.status);
        whereClauses.push(`status = $${params.length}`);
    }
    if (filter.sinceISO && !Number.isNaN(Date.parse(filter.sinceISO))) {
        params.push(filter.sinceISO);
        whereClauses.push(`flagged_at >= $${params.length}`);
    }
    const limit = filter.limit && filter.limit > 0
        ? Math.min(Math.floor(filter.limit), 500)
        : 100;
    params.push(limit);
    const limitParamIdx = params.length;
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    return (0, pool_1.query)(`
    SELECT ${FLAG_SELECT_COLUMNS}
    FROM hub_flags
    ${where}
    ORDER BY flagged_at DESC
    LIMIT $${limitParamIdx}
    `, params);
}
async function triageFlag(id, input) {
    return (0, pool_1.queryOne)(`
    UPDATE hub_flags
    SET status          = $2,
        triaged_at      = NOW(),
        triaged_by      = $3,
        resolution_note = COALESCE($4, resolution_note),
        incident_id     = COALESCE($5, incident_id)
    WHERE id = $1
    RETURNING ${FLAG_SELECT_COLUMNS}
    `, [
        id,
        input.status,
        input.triagedBy,
        input.resolutionNote ?? null,
        input.incidentId ?? null,
    ]);
}
//# sourceMappingURL=hubFlagsService.js.map