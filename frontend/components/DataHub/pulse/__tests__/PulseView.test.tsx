import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { PulseSnapshot } from '@/types/pulse';

// Mock the hook BEFORE importing PulseView
const usePulseSnapshotMock = vi.fn();
vi.mock('@/hooks/usePulseSnapshot', () => ({
  usePulseSnapshot: () => usePulseSnapshotMock(),
}));

// next/link is a client component; we stub it to a plain anchor so the link
// in AnomalyCallout renders deterministically in jsdom.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// PulseView (Phase 1 hub-trust wiring) consumes useRouter for anomaly
// drill-down and useHubSession for telemetry. Stub both so jsdom tests
// don't need an app-router or session-provider host.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useHubSession', () => ({
  useHubSession: () => ({ sessionId: null, recordEvent: () => {} }),
}));
// IncidentBannerWrapper (mounted under every flag-enabled KPICard) polls the
// active-incidents endpoint at render time. Stub to an empty list.
vi.mock('@/hooks/useActiveIncidents', () => ({
  useActiveIncidents: () => [],
}));

import { PulseView } from '../PulseView';

const SAMPLE_PAYLOAD: PulseSnapshot = {
  computedAt: new Date('2026-06-05T12:00:00Z').toISOString(),
  kpis: {
    registeredUsers: { value: 15455, delta24h: 173, delta24hPct: 1.04 },
    activeHolders: { value: 430, delta24h: 12, delta24hPct: 2.86 },
    aumUSD: { value: 13700, delta24h: -240, delta24hPct: -1.72 },
    stitchPct: { value: 22.0, delta24h: 0.3, delta24hPct: 1.38 },
    activations24h: { value: 47, delta24h: -5, delta24hPct: -9.62 },
    openWhalesCount: { value: 12, delta24h: 1, delta24hPct: 9.09 },
  },
  trends: {
    aum30d: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, '0')}`,
      value: 12000 + i * 50,
    })),
    signupsBySource24h: [
      { source: 'twitter', count: 22 },
      { source: 'snag', count: 14 },
      { source: 'organic', count: 9 },
      { source: 'discord', count: 5 },
      { source: 'other', count: 3 },
    ],
  },
  whaleActivity24h: [
    {
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
      wallet: 'AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdef12',
      asset: 'TSL2L',
      sizeUSD: 5000,
      event: 'open',
    },
  ],
  anomalies: [],
};

describe('PulseView', () => {
  beforeEach(() => {
    usePulseSnapshotMock.mockReset();
  });

  it('renders all 6 KPI labels when the hook resolves with a snapshot', () => {
    usePulseSnapshotMock.mockReturnValue({
      data: SAMPLE_PAYLOAD,
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { getByText } = render(<PulseView />);
    expect(getByText('Registered Users')).toBeTruthy();
    expect(getByText('Active Holders')).toBeTruthy();
    expect(getByText('AUM')).toBeTruthy();
    expect(getByText('Identity Links')).toBeTruthy();
    expect(getByText('Activations (24h)')).toBeTruthy();
    expect(getByText('Open Whales')).toBeTruthy();
  });

  it('renders the Pulse tab header with the subtitle question', () => {
    usePulseSnapshotMock.mockReturnValue({
      data: SAMPLE_PAYLOAD,
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { getByText } = render(<PulseView />);
    expect(getByText('Pulse')).toBeTruthy();
    expect(
      getByText(/Has anything material changed in the last 24h/i),
    ).toBeTruthy();
  });

  it('does not render any anomaly callouts when anomalies = []', () => {
    usePulseSnapshotMock.mockReturnValue({
      data: SAMPLE_PAYLOAD,
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { container } = render(<PulseView />);
    // No role=status (AnomalyCallout's wrapper role)
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('renders an anomaly callout with the Investigate CTA when anomalies are present', () => {
    const withAnomaly: PulseSnapshot = {
      ...SAMPLE_PAYLOAD,
      anomalies: [
        {
          severity: 'warn',
          message: 'Twitter signups dropped 42% vs 7-day average',
          actionView: 'attribution',
        },
      ],
    };
    usePulseSnapshotMock.mockReturnValue({
      data: withAnomaly,
      loading: false,
      error: null,
      refetch: () => {},
    });
    const { container, getByText } = render(<PulseView />);
    expect(
      getByText('Twitter signups dropped 42% vs 7-day average'),
    ).toBeTruthy();
    // Anomaly wrapper has role=status
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    // Phase-1 trust wiring: AnomalyCallout uses onAction (button), not href,
    // so PulseView can interpose telemetry before router.push().
    expect(getByText('Investigate')).toBeTruthy();
  });

  it('renders the error placeholder when the hook errors with no data', () => {
    usePulseSnapshotMock.mockReturnValue({
      data: null,
      loading: false,
      error: 'network down',
      refetch: () => {},
    });
    const { container } = render(<PulseView />);
    // Header still renders
    expect(container.textContent).toContain('Pulse');
    // EmptyState surfaces the stale headline
    expect(container.textContent).toContain('Data temporarily unavailable');
  });

  it('renders a skeleton grid before the first response resolves', () => {
    usePulseSnapshotMock.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: () => {},
    });
    const { container } = render(<PulseView />);
    // No KPI labels yet because the skeleton renders empty cells
    expect(container.textContent).not.toContain('Registered Users');
    expect(container.textContent).toContain('Pulse');
  });
});
