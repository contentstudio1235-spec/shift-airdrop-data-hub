// ============================================================
// identityService — searchProfiles referrer filter (Phase 2.1B)
// ============================================================
// Covers the KOL drill-down contract:
//   ?referrer=<string>&referrerType=snag|utm
//
// referrerType='utm'  → WHERE p.first_utm_source = $N
// referrerType='snag' → WHERE EXISTS (SELECT 1 FROM users
//                                     WHERE user_profile_id = p.profile_id
//                                       AND referred_by_code = $N)
//
// Both filters are applied to BOTH rowsQuery and countQuery via the shared
// whereSql — these tests assert that by inspecting the captured SQL on both
// the rows query (which has the SELECT with ${VOLUME_SUBQUERY} etc) and the
// count query (the inner SELECT p.profile_id).
//
// NOTE on row-multiplication safety:
//   referrerType='snag' uses EXISTS — semi-join semantics — so it CANNOT
//   inflate the GROUP BY p.profile_id counts. This was the explicit fix in
//   MR !21 that we must not regress.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '../../db/pool';
import { searchProfiles } from '../identityService';

vi.mock('../../db/pool');

// ── Helpers ──────────────────────────────────────────────────────────────────

interface CapturedCall {
  sql: string;
  params: unknown[];
}

function captureQueries(): { calls: CapturedCall[]; querySpy: ReturnType<typeof vi.spyOn> } {
  const calls: CapturedCall[] = [];
  const querySpy = vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params: params ?? [] });
    return [] as any;
  });
  vi.spyOn(db, 'queryOne').mockImplementation(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params: params ?? [] });
    return { total: '0' } as any;
  });
  return { calls, querySpy };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ── No referrer filter applied ───────────────────────────────────────────────

describe('searchProfiles — no referrer filter', () => {
  it('does NOT add referrer WHERE clause when both params are missing', async () => {
    const { calls } = captureQueries();
    await searchProfiles({ page: 1, pageSize: 10 });

    expect(calls.length).toBe(2);
    for (const call of calls) {
      expect(call.sql).not.toContain('referred_by_code');
      expect(call.sql).not.toContain('u_ref.user_profile_id');
    }
    // params: nothing referrer-shaped
    for (const call of calls) {
      expect(call.params.includes('cobie')).toBe(false);
      expect(call.params.includes('DYENZ3')).toBe(false);
    }
  });

  it('does NOT add referrer WHERE clause when referrerType is missing', async () => {
    const { calls } = captureQueries();
    await searchProfiles({ referrer: 'cobie', page: 1, pageSize: 10 });

    for (const call of calls) {
      expect(call.sql).not.toContain('referred_by_code');
      expect(call.sql).not.toContain('u_ref.user_profile_id');
      // first_utm_source filter shouldn't fire from referrer-only either —
      // it's only emitted by the `source` filter path, not this one.
      expect(call.params.includes('cobie')).toBe(false);
    }
  });

  it('does NOT add referrer WHERE clause when referrer is missing', async () => {
    const { calls } = captureQueries();
    await searchProfiles({
      // @ts-expect-error — runtime allows partial, but the route blocks; this
      // verifies the service is defensive even if called directly.
      referrerType: 'snag',
      page: 1,
      pageSize: 10,
    });

    for (const call of calls) {
      expect(call.sql).not.toContain('referred_by_code');
    }
  });
});

// ── referrerType=utm → first_utm_source filter ───────────────────────────────

describe('searchProfiles — referrerType=utm', () => {
  it('adds p.first_utm_source = $N to BOTH rowsQuery and countQuery', async () => {
    const { calls } = captureQueries();
    await searchProfiles({
      referrer: 'cobie',
      referrerType: 'utm',
      page: 1,
      pageSize: 10,
    });

    expect(calls.length).toBe(2);
    for (const call of calls) {
      expect(call.sql).toContain('p.first_utm_source = $');
      expect(call.params).toContain('cobie');
      // Must NOT reach for the snag column
      expect(call.sql).not.toContain('referred_by_code');
    }
  });
});

// ── referrerType=snag → EXISTS subquery against users ────────────────────────

describe('searchProfiles — referrerType=snag', () => {
  it('adds EXISTS subquery on users.referred_by_code joined by user_profile_id', async () => {
    const { calls } = captureQueries();
    await searchProfiles({
      referrer: 'DYENZ3',
      referrerType: 'snag',
      page: 1,
      pageSize: 10,
    });

    expect(calls.length).toBe(2);
    for (const call of calls) {
      expect(call.sql).toContain('EXISTS');
      expect(call.sql).toContain('FROM users u_ref');
      expect(call.sql).toContain('u_ref.user_profile_id = p.profile_id');
      expect(call.sql).toContain('u_ref.referred_by_code = $');
      expect(call.params).toContain('DYENZ3');
    }
  });

  it('uses EXISTS (semi-join) — does NOT add a row-multiplying JOIN against users', async () => {
    const { calls } = captureQueries();
    await searchProfiles({
      referrer: 'DYENZ3',
      referrerType: 'snag',
      page: 1,
      pageSize: 10,
    });

    // Negative assertion: the SHIFT users table must not appear as an outer JOIN
    // target in the rowsQuery. Only the EXISTS subquery may reference `users`.
    // We check by ensuring no "JOIN users" pattern appears in the outer query
    // (outside of the subquery context). The rowsQuery contains LEFT JOINs only
    // on identity_links — verify `users` is never JOINed at the outer level.
    for (const call of calls) {
      // The only allowed reference is "FROM users u_ref" inside the EXISTS.
      // No "JOIN users" anywhere — that would be the row-multiplication regression.
      expect(call.sql).not.toMatch(/JOIN\s+users\b/);
    }
  });

  it('uses parameterized SQL — no string interpolation of referrer into the SQL body', async () => {
    const { calls } = captureQueries();
    const malicious = "abc' OR 1=1 --";
    await searchProfiles({
      referrer: malicious,
      referrerType: 'snag',
      page: 1,
      pageSize: 10,
    });

    for (const call of calls) {
      // The raw string MUST NOT appear in the SQL body
      expect(call.sql).not.toContain(malicious);
      // It MUST be bound as a parameter
      expect(call.params).toContain(malicious);
    }
  });
});

// ── Consistency: rowsQuery vs countQuery share the same WHERE ────────────────

describe('searchProfiles — filter parity between rows and count', () => {
  it('applies the referrer filter to both queries so `total` matches rows', async () => {
    const { calls } = captureQueries();
    await searchProfiles({
      referrer: 'cobie',
      referrerType: 'utm',
      page: 1,
      pageSize: 10,
    });

    // Both queries (rows + count) must reference the filter — otherwise
    // pagination math becomes inconsistent with the visible rows.
    const rowsCall = calls.find(c => c.sql.includes('lifetime_volume_usd'));
    const countCall = calls.find(c => c.sql.includes('COUNT(*)'));
    expect(rowsCall).toBeTruthy();
    expect(countCall).toBeTruthy();
    expect(rowsCall!.sql).toContain('p.first_utm_source = $');
    expect(countCall!.sql).toContain('p.first_utm_source = $');
  });
});
