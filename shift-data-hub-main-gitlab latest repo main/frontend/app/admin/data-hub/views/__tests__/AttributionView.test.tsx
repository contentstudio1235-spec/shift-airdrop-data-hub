import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SourceKPIRow } from '../AttributionView';
import type { AttributionOverview } from '@/hooks/useAttributionOverview';

// SourceKPIRow shows the three Level-1 attribution KPI cards. We assert the
// "Best ROI Source · 30d" card's subtitle appends an "unattributed" caveat
// when the winning channel is the residual `Direct` bucket.

function makeOverview(channels: AttributionOverview['channels']): AttributionOverview {
  return {
    channels,
    campaigns: [],
    coverage: {
      total: 17234,
      withUtm: 1,
      withReferralOnly: 11328,
      neither: 5905,
      percentWithSignal: 66.0,
      percentWithUtm: 0.0,
    },
    computedAt: '2026-06-06T00:00:00Z',
    dataQuality: 'good',
  };
}

const DIRECT_CHANNEL_OVERVIEW: AttributionOverview = makeOverview([
  {
    source: 'Direct',
    users: 5848,
    stitchedUsers: 5848,
    holders: 412,
    whales: 4,
    totalVolumeUSD: 0,
    avgPositionUSD: 0,
    attribution: 'first_touch',
  },
]);

const REAL_CHANNEL_OVERVIEW: AttributionOverview = makeOverview([
  {
    source: 'twitter',
    users: 100,
    stitchedUsers: 100,
    holders: 30,
    whales: 1,
    totalVolumeUSD: 5000,
    avgPositionUSD: 50,
    attribution: 'first_touch',
  },
]);

describe('SourceKPIRow Best ROI caveat', () => {
  it('appends "unattributed" to subtitle when best source is Direct', () => {
    const { container } = render(
      <SourceKPIRow overview={DIRECT_CHANNEL_OVERVIEW} kol={null} />
    );
    expect(container.textContent).toMatch(/Best ROI Source/i);
    // Subtitle still carries the holder/users count
    expect(container.textContent).toMatch(/412 holders \/ 5,848 users/);
    // And now warns the operator that this winner is the residual bucket
    expect(container.textContent).toMatch(/unattributed/i);
  });

  it('does NOT append "unattributed" when best source is a real channel', () => {
    const { container } = render(
      <SourceKPIRow overview={REAL_CHANNEL_OVERVIEW} kol={null} />
    );
    expect(container.textContent).toMatch(/30 holders \/ 100 users/);
    expect(container.textContent).not.toMatch(/unattributed/i);
  });
});
