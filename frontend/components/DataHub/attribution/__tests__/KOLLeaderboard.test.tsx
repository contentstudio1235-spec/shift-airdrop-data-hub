import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { KOLPayload } from '@/hooks/useKOLLeaderboard';

// useRouter must be mocked BEFORE importing KOLLeaderboard. We capture the
// push spy at module scope so each test can assert against it.
const pushSpy = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { KOLLeaderboard } from '../KOLLeaderboard';

const EMPTY_PAYLOAD: KOLPayload = {
  rows: [],
  totals: { totalReferrers: 0, activeReferrers: 0 },
  computedAt: '2026-06-04T00:00:00Z',
  dataQuality: 'good',
};

const PAYLOAD_WITH_ROW: KOLPayload = {
  rows: [
    {
      referrer: 'twitterHandle',
      source: 'snag_referrals',
      users: 42,
      holders: 7,
      whales: 2,
      holderRate: 0.15,
      totalVolumeUSD: 12500,
      avgVolumePerUserUSD: 297.62,
      score: 4.87,
      firstSeenAt: '2026-01-01T00:00:00Z',
      lastSeenAt: '2026-06-01T00:00:00Z',
    },
  ],
  totals: { totalReferrers: 1, activeReferrers: 1 },
  computedAt: '2026-06-04T00:00:00Z',
  dataQuality: 'good',
};

const PAYLOAD_WITH_TWO_ROWS: KOLPayload = {
  rows: [
    {
      referrer: 'alpha',
      source: 'snag_referrals',
      users: 50,
      holders: 10,
      whales: 3,
      holderRate: 0.2,
      totalVolumeUSD: 20000,
      avgVolumePerUserUSD: 400,
      score: 5.5,
      firstSeenAt: '2026-01-01T00:00:00Z',
      lastSeenAt: '2026-06-01T00:00:00Z',
    },
    {
      referrer: 'beta',
      // Backend only ever emits 'snag_referrals' or 'other' — never 'utm'.
      // 'other' is the UTM-attributed bucket (first_utm_source non-null).
      source: 'other',
      users: 30,
      holders: 4,
      whales: 1,
      holderRate: 0.13,
      totalVolumeUSD: 8000,
      avgVolumePerUserUSD: 266,
      score: 3.2,
      firstSeenAt: '2026-02-01T00:00:00Z',
      lastSeenAt: '2026-06-01T00:00:00Z',
    },
  ],
  totals: { totalReferrers: 2, activeReferrers: 2 },
  computedAt: '2026-06-04T00:00:00Z',
  dataQuality: 'good',
};

beforeEach(() => {
  pushSpy.mockReset();
});

describe('KOLLeaderboard', () => {
  it('renders empty state when no rows', () => {
    const { container } = render(
      <KOLLeaderboard data={EMPTY_PAYLOAD} loading={false} error={null} />
    );
    expect(container.textContent).toContain('No referrers with 5+');
    expect(container.querySelector('table')).toBeNull();
  });

  it('renders a row with holder rate pill at 15.0%', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_ROW} loading={false} error={null} />
    );
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.textContent).toContain('twitterHandle');
    expect(container.textContent).toContain('15.0%');
    // Source badge
    expect(container.textContent).toContain('Snag');
  });

  it('shows ONLY the 3 primary columns in the always-visible header (REFERRER, USERS, RATE)', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_ROW} loading={false} error={null} />
    );
    const headerCells = Array.from(container.querySelectorAll('thead th'));
    const labels = headerCells
      .map((th) => (th.textContent ?? '').trim())
      .filter((t) => t.length > 0);
    // Should be exactly: REFERRER, USERS (LIFETIME), RATE
    expect(labels).toEqual(['REFERRER', 'USERS (LIFETIME)', 'RATE']);
    // Diagnostic columns are NOT in the header
    expect(labels).not.toContain('HOLDERS');
    expect(labels).not.toContain('VOLUME');
    expect(labels).not.toContain('AVG/USER');
    expect(labels).not.toContain('SCORE');
  });

  it('renders an expand chevron on each row', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_TWO_ROWS} loading={false} error={null} />
    );
    const expandButtons = container.querySelectorAll('button[aria-label^="Expand"]');
    expect(expandButtons.length).toBe(2);
  });

  it('expanding a row reveals the 5 detail fields in a <dl>', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_ROW} loading={false} error={null} />
    );
    // Before expand: no <dl>
    expect(container.querySelector('dl')).toBeNull();

    const expandBtn = container.querySelector(
      'button[aria-label="Expand twitterHandle details"]'
    ) as HTMLButtonElement | null;
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn!);

    const dl = container.querySelector('dl');
    expect(dl).toBeTruthy();
    const dtLabels = Array.from(dl!.querySelectorAll('dt')).map((d) =>
      (d.textContent ?? '').trim()
    );
    expect(dtLabels).toEqual(['HOLDERS', 'WHALES', 'VOLUME', 'AVG/USER', 'SCORE']);
    // Detail values present
    expect(dl!.textContent).toContain('4.87'); // SCORE
  });

  it('clicking the chevron again collapses the expanded row', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_ROW} loading={false} error={null} />
    );
    const expandBtn = container.querySelector(
      'button[aria-label="Expand twitterHandle details"]'
    ) as HTMLButtonElement | null;
    fireEvent.click(expandBtn!);
    expect(container.querySelector('dl')).toBeTruthy();

    // After expansion the button's label flips to "Collapse..."
    const collapseBtn = container.querySelector(
      'button[aria-label="Collapse twitterHandle details"]'
    ) as HTMLButtonElement | null;
    expect(collapseBtn).toBeTruthy();
    fireEvent.click(collapseBtn!);
    expect(container.querySelector('dl')).toBeNull();
  });

  it('expanding row B collapses already-expanded row A', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_TWO_ROWS} loading={false} error={null} />
    );
    const alphaBtn = container.querySelector(
      'button[aria-label="Expand alpha details"]'
    ) as HTMLButtonElement | null;
    fireEvent.click(alphaBtn!);
    // alpha is expanded → its dl carries its score
    expect(container.textContent).toContain('5.50');

    const betaBtn = container.querySelector(
      'button[aria-label="Expand beta details"]'
    ) as HTMLButtonElement | null;
    fireEvent.click(betaBtn!);

    // Exactly one <dl> visible (only beta is expanded)
    const dls = container.querySelectorAll('dl');
    expect(dls.length).toBe(1);
    expect(dls[0].textContent).toContain('3.20');
    // alpha's score value should not be in the visible detail anymore
    expect(dls[0].textContent).not.toContain('5.50');
  });

  it('clicking a row body cell calls router.push with the drill-down URL (snag → referrerType=snag)', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_ROW} loading={false} error={null} />
    );
    const row = container.querySelector('tbody tr[role="button"]') as HTMLTableRowElement | null;
    expect(row).toBeTruthy();
    fireEvent.click(row!);
    expect(pushSpy).toHaveBeenCalledTimes(1);
    const url = pushSpy.mock.calls[0][0] as string;
    expect(url.startsWith('/admin/data-hub?')).toBe(true);
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('view')).toBe('users');
    // Phase 2.1B contract: ?referrer=<value>&referrerType=snag|utm.
    // The old ?source= and ?utmSource= params are NOT emitted anymore.
    expect(qs.get('referrer')).toBe('twitterHandle');
    expect(qs.get('referrerType')).toBe('snag');
    expect(qs.has('source')).toBe(false);
    expect(qs.has('utmSource')).toBe(false);
  });

  it('clicking an "other" row drill-down sends referrerType=utm', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_TWO_ROWS} loading={false} error={null} />
    );
    // Default sort is by `users` desc → alpha (50) comes first, beta (30) second.
    const rows = container.querySelectorAll('tbody tr[role="button"]');
    expect(rows.length).toBe(2);
    fireEvent.click(rows[1]); // beta = 'other'
    const url = pushSpy.mock.calls[0][0] as string;
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('referrer')).toBe('beta');
    expect(qs.get('referrerType')).toBe('utm');
    expect(qs.has('source')).toBe(false);
    expect(qs.has('utmSource')).toBe(false);
  });

  it('pressing Enter on a focused row triggers navigation with referrer+referrerType', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_ROW} loading={false} error={null} />
    );
    const row = container.querySelector('tbody tr[role="button"]') as HTMLTableRowElement | null;
    expect(row).toBeTruthy();
    fireEvent.keyDown(row!, { key: 'Enter' });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    const url = pushSpy.mock.calls[0][0] as string;
    expect(url).toContain('view=users');
    expect(url).toContain('referrer=twitterHandle');
    expect(url).toContain('referrerType=snag');
  });

  it('clicking the expand chevron does NOT trigger row navigation (stopPropagation)', () => {
    const { container } = render(
      <KOLLeaderboard data={PAYLOAD_WITH_ROW} loading={false} error={null} />
    );
    const expandBtn = container.querySelector(
      'button[aria-label="Expand twitterHandle details"]'
    ) as HTMLButtonElement | null;
    expect(expandBtn).toBeTruthy();
    fireEvent.click(expandBtn!);
    // Row navigation must NOT have fired
    expect(pushSpy).not.toHaveBeenCalled();
    // But the row IS now expanded
    expect(container.querySelector('dl')).toBeTruthy();
  });
});
