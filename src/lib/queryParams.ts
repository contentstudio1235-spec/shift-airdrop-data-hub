// src/lib/queryParams.ts
import type { FunnelQueryParams, CohortDim } from '../types/funnel';

const ALLOWED_COHORT_DIMS: CohortDim[] = ['day', 'week', 'month'];

// MR !29 (F1 funnel time-window selector). Frontend writes `?fwindow=30d`
// for semantic URL clarity (operator mental model: "always last 30 days");
// backend derives an absolute `from` cutoff so the existing funnelService
// SQL (WHERE $1::timestamp IS NULL OR created_at >= $1) works unchanged.
//
// Explicit `from` in query still wins (back-compat for already-shared dated
// URLs + per-funnel test fixtures). `fwindow=all` is a deliberate no-op
// that suppresses any derived window so all-time data renders.
const FWINDOW_TO_DAYS: Record<string, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  'all': null,
};

function deriveFromForFwindow(fwindow: string | undefined): string | undefined {
  if (!fwindow) return undefined;
  if (!(fwindow in FWINDOW_TO_DAYS)) return undefined;
  const days = FWINDOW_TO_DAYS[fwindow];
  if (days === null) return undefined; // 'all' = no filter
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString().slice(0, 10);
}

export function parseQueryParams(raw: Record<string, string | undefined>): FunnelQueryParams {
  const parsed: FunnelQueryParams = {};

  if (raw.from && isValidISODate(raw.from)) parsed.from = raw.from;
  if (raw.to && isValidISODate(raw.to)) parsed.to = raw.to;
  if (raw.source && /^[a-z0-9_-]{1,40}$/i.test(raw.source)) parsed.source = raw.source.toLowerCase();
  if (raw.asset && /^[A-Z0-9]{2,10}$/.test(raw.asset)) parsed.asset = raw.asset.toUpperCase();
  if (raw.cohort && ALLOWED_COHORT_DIMS.includes(raw.cohort as CohortDim)) {
    parsed.cohort = raw.cohort as CohortDim;
  }

  const min = raw.walletSizeMin ? Number(raw.walletSizeMin) : NaN;
  if (Number.isFinite(min) && min >= 0) parsed.walletSizeMin = min;

  const max = raw.walletSizeMax ? Number(raw.walletSizeMax) : NaN;
  if (Number.isFinite(max) && max >= 0) parsed.walletSizeMax = max;

  if (!parsed.from) {
    const derived = deriveFromForFwindow(raw.fwindow);
    if (derived) parsed.from = derived;
  }

  return parsed;
}

function isValidISODate(s: string): boolean {
  // Must match strict ISO 8601 — date or date+time with Z suffix
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z)?$/.test(s)) return false;
  const parsed = Date.parse(s);
  if (isNaN(parsed)) return false;
  // Round-trip check — rejects silently-rolled-over dates like 2026-02-30
  const reformatted = new Date(parsed).toISOString();
  // Compare the date portion (YYYY-MM-DD)
  return reformatted.slice(0, 10) === s.slice(0, 10);
}
