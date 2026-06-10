import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CohortsSnapshot } from '@/types/cohort';

// Mock the hook BEFORE importing CohortsView
const useCohortsSnapshotMock = vi.fn();
vi.mock('@/hooks/useCohortsSnapshot', () => ({
  useCohortsSnapshot: () => useCohortsSnapshotMock(),
}));

import { CohortsView } from '../CohortsView';

/**
 * Build a snapshot with 12 weekly cohorts. cohortKey labels go newest first
 * to mirror the contract. Activation drifts up so trend reads "improving".
 */
function buildSnapshot(): CohortsSnapshot {
  const cohorts = Array.from({ length: 12 }, (_, i) => {
    const week = 23 - i; // W23 newest, W12 oldest
    const isYoung = i === 0; // newest cohort: retention null
    return {
      cohortKey: `2026-W${String(week).padStart(2, '0')}`,
      weekStart: `2026-${String(6 - Math.floor(i / 4)).padStart(2, '0')}-01`,
      size: 200 + i * 10,
      activated: 80 - i * 4,
      activationPct: Math.max(1, 45 - i * 3),
      retentionWeek1: isYoung ? null : 60 - i * 2,
      retentionWeek4: i >= 5 ? 40 - (i - 5) * 2 : null,
      lifetimeVolumeUSD: 50_000 - i * 1_500,
      avgVolumePerUser: 250 - i * 10,
      whales: 6 - Math.floor(i / 2),
      stitchPct: 35 - i * 1.5,
    };
  });
  return {
    computedAt: new Date('2026-06-05T12:00:00Z').toISOString(),
    cohorts,
    summary: {
      trend: 'improving',
      recentAvgActivation: 39.0,
      historicalAvgActivation: 25.5,
      deltaPP: 13.5,
      bestCohort: { cohortKey: '2026-W23', activationPct: 45 },
      worstCohort: { cohortKey: '2026-W12', activationPct: 12 },
    },
  };
}

describe('CohortsView', () => {
  beforeEach(() => {
    useCohortsSnapshotMock.mockReset();
  });

  it('renders the tab header with the operator question', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: buildSnapshot(),
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { getByText } = render(<CohortsView />);
    expect(getByText('Trader Cohorts')).toBeTruthy();
    expect(
      getByText(
        /Are recent signup cohorts performing better, worse, or the same as older ones/i,
      ),
    ).toBeTruthy();
  });

  it('renders the 3 summary cards and the table with 12 rows', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: buildSnapshot(),
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { container, getByText } = render(<CohortsView />);

    // Summary card titles
    expect(getByText('Trend')).toBeTruthy();
    expect(getByText('Recent vs Historical')).toBeTruthy();
    expect(getByText('Best / Worst')).toBeTruthy();

    // Trend label
    expect(getByText('Improving')).toBeTruthy();

    // The cohort table has a tbody with 12 rows
    const tbody = container.querySelector('tbody');
    expect(tbody).toBeTruthy();
    expect(tbody!.querySelectorAll('tr')).toHaveLength(12);

    // Sort header is clickable
    expect(getByText('Cohort')).toBeTruthy();
    expect(getByText('Act %')).toBeTruthy();
  });

  it('renders newest cohort first by default sort', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: buildSnapshot(),
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { container } = render(<CohortsView />);
    const firstRow = container.querySelector('tbody tr');
    expect(firstRow?.textContent).toContain('2026-W23');
  });

  it('renders the loading panel when no data yet', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: () => {},
    });
    const { container } = render(<CohortsView />);
    expect(container.textContent).toContain('Loading cohort data');
  });

  it('renders the error panel when fetch fails with no data', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: null,
      loading: false,
      error: 'network_down',
      refetch: () => {},
    });
    const { container } = render(<CohortsView />);
    expect(container.textContent).toContain('network_down');
    expect(container.textContent).toContain('Retry');
  });

  it('renders ReconciliationBadge on the W4 retention column header', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: buildSnapshot(),
      loading: false,
      error: null,
      refetch: () => {},
    });
    render(<CohortsView />);
    // W4 Ret column has flagMetricId = cohorts.retentionWeek4, which IS in the
    // reconciliation catalog (cohortRetention.test.ts). Badge must mount.
    expect(
      screen.getByLabelText(/cohorts\.retentionWeek4 reconciled against second source/i),
    ).toBeTruthy();
  });

  it('does NOT render ReconciliationBadge on activationPct column', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: buildSnapshot(),
      loading: false,
      error: null,
      refetch: () => {},
    });
    render(<CohortsView />);
    // activationPct column has no flagMetricId (not in COLUMNS), and even if
    // it did, cohorts.activationPct is NOT in the reconciliation catalog yet.
    expect(
      screen.queryByLabelText(/cohorts\.activationPct reconciled against second source/i),
    ).toBeNull();
  });

  it('renders the empty panel when cohorts array is empty', () => {
    useCohortsSnapshotMock.mockReturnValue({
      data: {
        computedAt: new Date().toISOString(),
        cohorts: [],
        summary: {
          trend: 'stable',
          recentAvgActivation: 0,
          historicalAvgActivation: 0,
          deltaPP: 0,
          bestCohort: { cohortKey: '—', activationPct: 0 },
          worstCohort: { cohortKey: '—', activationPct: 0 },
        },
      },
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { container } = render(<CohortsView />);
    expect(container.textContent).toContain('No cohort data yet');
  });
});
