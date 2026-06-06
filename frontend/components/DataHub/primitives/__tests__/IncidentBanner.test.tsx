import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { IncidentBanner, IncidentBannerWrapper } from '../IncidentBanner';
import type { HubIncident } from '@/hooks/useActiveIncidents';

const ORIGINAL_FETCH = global.fetch;

function makeIncident(overrides: Partial<HubIncident> = {}): HubIncident {
  return {
    id: 7,
    openedAt: '2026-06-06T14:32:00Z',
    openedBy: 'tomer',
    severity: 'P0',
    affectedTabs: ['pulse'],
    affectedMetric: 'pulse.aumUSD',
    hypothesis: 'row multiplication on positions join',
    resolvedAt: null,
    resolution: null,
    fixCommitSha: null,
    ...overrides,
  };
}

function mockFetch(incidents: HubIncident[]) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ incidents }),
    }),
  ) as unknown as typeof fetch;
}

describe('IncidentBanner (raw)', () => {
  it('renders the hypothesis text and the since timestamp', () => {
    const { container, getByText } = render(
      <IncidentBanner incident={makeIncident()} />,
    );
    expect(container.textContent).toContain('Under investigation since');
    expect(getByText('row multiplication on positions join')).toBeTruthy();
  });

  it('falls back to a default hypothesis when null', () => {
    const { getByText } = render(
      <IncidentBanner incident={makeIncident({ hypothesis: null })} />,
    );
    expect(getByText('Hub is showing an unexpected value')).toBeTruthy();
  });

  it('exposes severity via data-severity for downstream filtering', () => {
    const { container } = render(
      <IncidentBanner incident={makeIncident({ severity: 'P1' })} />,
    );
    const banner = container.querySelector('[data-testid="incident-banner"]');
    expect(banner?.getAttribute('data-severity')).toBe('P1');
  });

  it('uses threshold yellow border for P1/P2 and red for P0', () => {
    const { container: c0 } = render(
      <IncidentBanner incident={makeIncident({ severity: 'P0' })} />,
    );
    const banner0 = c0.querySelector('[data-testid="incident-banner"]') as HTMLElement;
    // #ff5a5a in JSDOM → rgb(255, 90, 90)
    expect(banner0.style.border).toMatch(/rgb\(255,\s*90,\s*90\)/);

    const { container: c1 } = render(
      <IncidentBanner incident={makeIncident({ severity: 'P1' })} />,
    );
    const banner1 = c1.querySelector('[data-testid="incident-banner"]') as HTMLElement;
    // #ff9a3c in JSDOM → rgb(255, 154, 60)
    expect(banner1.style.border).toMatch(/rgb\(255,\s*154,\s*60\)/);
  });
});

describe('IncidentBannerWrapper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('renders children when no incidents match', async () => {
    mockFetch([]);
    const { container } = render(
      <IncidentBannerWrapper tab="pulse" metricId="pulse.aumUSD">
        <span data-testid="value-cell">$13.7K</span>
      </IncidentBannerWrapper>,
    );
    // Allow the initial fetch microtasks to drain.
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="value-cell"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="incident-banner"]')).toBeNull();
  });

  it('renders the banner (replacing children) when an incident matches tab+metric', async () => {
    mockFetch([makeIncident()]);
    const { container } = render(
      <IncidentBannerWrapper tab="pulse" metricId="pulse.aumUSD">
        <span data-testid="value-cell">$13.7K</span>
      </IncidentBannerWrapper>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="incident-banner"]')).toBeTruthy();
    // Children HIDDEN — banner replaces them entirely
    expect(container.querySelector('[data-testid="value-cell"]')).toBeNull();
  });

  it('does NOT render the banner when the incident is on a different tab', async () => {
    mockFetch([makeIncident({ affectedTabs: ['users'] })]);
    const { container } = render(
      <IncidentBannerWrapper tab="pulse" metricId="pulse.aumUSD">
        <span data-testid="value-cell">$13.7K</span>
      </IncidentBannerWrapper>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="incident-banner"]')).toBeNull();
    expect(container.querySelector('[data-testid="value-cell"]')).toBeTruthy();
  });

  it('ignores resolved incidents (resolvedAt set)', async () => {
    mockFetch([makeIncident({ resolvedAt: '2026-06-06T15:00:00Z' })]);
    const { container } = render(
      <IncidentBannerWrapper tab="pulse" metricId="pulse.aumUSD">
        <span data-testid="value-cell">$13.7K</span>
      </IncidentBannerWrapper>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="incident-banner"]')).toBeNull();
  });

  it('polls every 30s', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ incidents: [] }),
      }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    render(
      <IncidentBannerWrapper tab="pulse" metricId="pulse.aumUSD">
        <span>$13.7K</span>
      </IncidentBannerWrapper>,
    );

    // Initial tick
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance 30s → second poll
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Advance another 30s → third
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
