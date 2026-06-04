import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KOLLeaderboard } from '../KOLLeaderboard';
import type { KOLPayload } from '@/hooks/useKOLLeaderboard';

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
    // Score cell
    expect(container.textContent).toContain('4.87');
    // Source badge
    expect(container.textContent).toContain('Snag');
  });
});
