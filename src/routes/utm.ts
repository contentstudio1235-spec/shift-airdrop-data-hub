// ============================================================
// /api/utm — admin-key gated UTM governance endpoints (Phase A)
// ============================================================
// Read endpoints:
//   GET  /api/utm/violations          — { violations: Violation[] }
//   GET  /api/utm/campaigns           — { campaigns: Campaign[] }
//   GET  /api/utm/approved-sources    — string[]  (bare array)
//   GET  /api/utm/approved-mediums    — string[]  (bare array)
//
// Write endpoints:
//   POST /api/utm/campaigns           — bare Campaign  (camelCase keys)
//
// All endpoints require the `x-admin-key` header (matches /api/users).
//
// ── CONTRACT NOTES ──
// 1. Every SELECT aliases snake_case columns to camelCase using double-quoted
//    Postgres identifiers (`"camelCase"`). Without double quotes Postgres
//    silently lowercases identifiers and the JSON would still ship snake_case.
// 2. POST bodies are camelCase; INSERT column names stay snake_case (matching
//    the actual table DDL). The mapping happens in JS, not in SQL.
// 3. Response envelopes match the frontend's expected shape exactly — bare
//    arrays for the allow-lists, `{ violations|campaigns: [...] }` for the
//    paged lists, bare object on POST 201. Any change here breaks the UI.
// ============================================================

import { Router, type Request, type Response } from 'express';
import { config } from '../config';
import { query, queryOne } from '../db/pool';
import {
  getApprovedSources,
  getApprovedMediums,
} from '../services/utmService';

const router = Router();

// ── Admin auth ───────────────────────────────────────────────
router.use((req: Request, res: Response, next) => {
  const adminKey = req.header('x-admin-key');
  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

// ── Helpers ──────────────────────────────────────────────────

const CAMPAIGN_NAME_PATTERN = /^[a-z0-9-]+$/;

function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildFullUrl(
  destination: string,
  parts: { source: string; medium: string; campaign: string; content?: string | null; term?: string | null },
): string {
  const u = new URL(destination);
  u.searchParams.set('utm_source', parts.source);
  u.searchParams.set('utm_medium', parts.medium);
  u.searchParams.set('utm_campaign', parts.campaign);
  if (parts.content) u.searchParams.set('utm_content', parts.content);
  if (parts.term) u.searchParams.set('utm_term', parts.term);
  return u.toString();
}

// ── Shared SQL fragments ─────────────────────────────────────
// Aliases every snake_case column to camelCase using double quotes. The
// double quotes are LOAD-BEARING — without them Postgres lowercases the
// identifier and we end up with `occurredat`/`displayname` etc. in JSON.
const CAMPAIGN_SELECT_COLUMNS = `
  id,
  created_at      AS "createdAt",
  created_by      AS "createdBy",
  display_name    AS "displayName",
  destination_url AS "destinationUrl",
  utm_source      AS "utmSource",
  utm_medium      AS "utmMedium",
  utm_campaign    AS "utmCampaign",
  utm_content     AS "utmContent",
  utm_term        AS "utmTerm",
  notes,
  budget_usd      AS "budgetUSD",
  expected_reach  AS "expectedReach",
  full_url        AS "fullUrl",
  short_url       AS "shortUrl",
  is_archived     AS "isArchived"
`;

const VIOLATION_SELECT_COLUMNS = `
  id,
  occurred_at     AS "occurredAt",
  profile_id      AS "profileId",
  raw_url         AS "rawUrl",
  rejected_field  AS "rejectedField",
  rejected_value  AS "rejectedValue",
  reason,
  raw_referrer    AS "rawReferrer",
  user_agent      AS "userAgent"
`;

// ── GET /api/utm/violations ──────────────────────────────────
// Query params:
//   since  — ISO timestamp; default 7 days ago
//   limit  — default 50, max 500
//   reason — exact-match filter on `reason` column
//
// Response: { violations: Violation[] }
router.get('/violations', async (req: Request, res: Response) => {
  try {
    const sinceRaw = typeof req.query.since === 'string' ? req.query.since : null;
    const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw))
      ? new Date(sinceRaw)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 500)
      : 50;

    const reason = typeof req.query.reason === 'string' ? req.query.reason : null;

    const params: unknown[] = [since.toISOString(), limit];
    let reasonClause = '';
    if (reason) {
      params.push(reason);
      reasonClause = `AND reason = $${params.length}`;
    }

    const rows = await query(
      `
      SELECT ${VIOLATION_SELECT_COLUMNS}
      FROM utm_violations
      WHERE occurred_at >= $1
      ${reasonClause}
      ORDER BY occurred_at DESC
      LIMIT $2
      `,
      params,
    );

    res.json({ violations: rows });
  } catch (err) {
    console.error('[utm/violations]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── GET /api/utm/campaigns ───────────────────────────────────
// Query params:
//   active — 'true' filters out archived campaigns
//   limit  — default 100, max 500
//
// Response: { campaigns: Campaign[] }
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const active = req.query.active === 'true';
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 500)
      : 100;

    const whereClause = active ? 'WHERE is_archived = FALSE' : '';

    const rows = await query(
      `
      SELECT ${CAMPAIGN_SELECT_COLUMNS}
      FROM campaigns
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit],
    );

    res.json({ campaigns: rows });
  } catch (err) {
    console.error('[utm/campaigns/list]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── GET /api/utm/approved-sources ────────────────────────────
// Response: string[]  (bare array — the frontend dropdown ingests this directly)
router.get('/approved-sources', async (_req: Request, res: Response) => {
  try {
    const sources = await getApprovedSources();
    res.json(sources);
  } catch (err) {
    console.error('[utm/approved-sources]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── GET /api/utm/approved-mediums ────────────────────────────
// Response: string[]  (bare array)
router.get('/approved-mediums', async (_req: Request, res: Response) => {
  try {
    const mediums = await getApprovedMediums();
    res.json(mediums);
  } catch (err) {
    console.error('[utm/approved-mediums]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ── POST /api/utm/campaigns ──────────────────────────────────
// Body (camelCase):
//   displayName, destinationUrl, utmSource, utmMedium, utmCampaign,
//   utmContent?, utmTerm?, notes?, budgetUSD?, expectedReach?, shortUrl?, createdBy?
//
// Response (201): bare Campaign with camelCase keys (matches GET shape).
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const body: Record<string, unknown> = (req.body && typeof req.body === 'object')
      ? req.body as Record<string, unknown>
      : {};

    // Helper: strict string coerce + trim.
    const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
    const optStr = (v: unknown): string | null => {
      const s = str(v);
      return s.length > 0 ? s : null;
    };
    const optNum = (v: unknown): number | null =>
      (typeof v === 'number' && Number.isFinite(v)) ? v : null;
    const optInt = (v: unknown): number | null => {
      const n = optNum(v);
      return n === null ? null : Math.floor(n);
    };

    const displayName     = str(body.displayName);
    const destinationUrl  = str(body.destinationUrl);
    const utmSourceRaw    = str(body.utmSource).toLowerCase();
    const utmMediumRaw    = str(body.utmMedium).toLowerCase();
    const utmCampaignRaw  = str(body.utmCampaign).toLowerCase();
    const utmContent      = optStr(body.utmContent)?.toLowerCase() ?? null;
    const utmTerm         = optStr(body.utmTerm)?.toLowerCase() ?? null;
    const notes           = optStr(body.notes);
    const budgetUSD       = optNum(body.budgetUSD);
    const expectedReach   = optInt(body.expectedReach);
    const shortUrl        = optStr(body.shortUrl);
    const createdBy       = optStr(body.createdBy) ?? 'admin';

    // ── Required field validation ──
    if (!displayName) {
      return res.status(400).json({ error: 'displayName_required' });
    }
    if (!destinationUrl || !isValidUrl(destinationUrl)) {
      return res.status(400).json({ error: 'destinationUrl_invalid' });
    }
    if (!utmSourceRaw) {
      return res.status(400).json({ error: 'utmSource_required' });
    }
    if (!utmMediumRaw) {
      return res.status(400).json({ error: 'utmMedium_required' });
    }
    if (!utmCampaignRaw) {
      return res.status(400).json({ error: 'utmCampaign_required' });
    }

    // ── Allow-list validation ──
    const [approvedSources, approvedMediums] = await Promise.all([
      getApprovedSources(),
      getApprovedMediums(),
    ]);

    if (!approvedSources.includes(utmSourceRaw)) {
      return res.status(400).json({
        error: 'utmSource_not_approved',
        approved: approvedSources,
      });
    }
    if (!approvedMediums.includes(utmMediumRaw)) {
      return res.status(400).json({
        error: 'utmMedium_not_approved',
        approved: approvedMediums,
      });
    }
    if (!CAMPAIGN_NAME_PATTERN.test(utmCampaignRaw)) {
      return res.status(400).json({
        error: 'utmCampaign_format_invalid',
        expected: 'lowercase letters, digits, and hyphens only',
      });
    }

    const fullUrl = buildFullUrl(destinationUrl, {
      source: utmSourceRaw,
      medium: utmMediumRaw,
      campaign: utmCampaignRaw,
      content: utmContent,
      term: utmTerm,
    });

    // INSERT uses snake_case column names (the actual DDL); RETURNING aliases
    // them back out to camelCase so the response shape matches GET /campaigns.
    const inserted = await queryOne(
      `
      INSERT INTO campaigns (
        created_by, display_name, destination_url,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        notes, budget_usd, expected_reach, full_url, short_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING ${CAMPAIGN_SELECT_COLUMNS}
      `,
      [
        createdBy,
        displayName,
        destinationUrl,
        utmSourceRaw,
        utmMediumRaw,
        utmCampaignRaw,
        utmContent,
        utmTerm,
        notes,
        budgetUSD,
        expectedReach,
        fullUrl,
        shortUrl,
      ],
    );

    res.status(201).json(inserted);
  } catch (err) {
    console.error('[utm/campaigns/create]', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
