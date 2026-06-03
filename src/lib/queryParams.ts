// src/lib/queryParams.ts
import type { FunnelQueryParams, CohortDim } from '../types/funnel';

const ALLOWED_COHORT_DIMS: CohortDim[] = ['day', 'week', 'month'];

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
