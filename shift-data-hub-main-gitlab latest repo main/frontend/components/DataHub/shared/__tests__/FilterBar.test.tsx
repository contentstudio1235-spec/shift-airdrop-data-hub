import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// useFilters mocks — match the pattern used by other DataHub tests.
let mockFilters: Record<string, unknown> = {};
vi.mock('@/hooks/useFilters', () => ({
  useFilters: () => [mockFilters, vi.fn(), vi.fn()],
}));

// next/navigation mock — DateRangePicker / SourcePicker may transitively
// reach for router state. Keep it harmless.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/data-hub',
}));

import { FilterBar } from '../FilterBar';

describe('FilterBar', () => {
  beforeEach(() => {
    mockFilters = {};
  });

  it('renders DateRangePicker on non-Pulse views', () => {
    render(<FilterBar activeView="funnels" />);
    // DateRangePicker exposes from / to date inputs; the "Last 24h" badge must NOT render.
    expect(screen.queryByText(/last 24h/i)).toBeNull();
  });

  it('renders the "Last 24h" badge instead of DateRangePicker on Pulse', () => {
    render(<FilterBar activeView="pulse" />);
    expect(screen.getByText(/last 24h/i)).toBeInTheDocument();
    // The badge has an explanatory title so screen-readers + hover give the
    // operator the design rationale.
    expect(screen.getByTitle(/24h compare snapshot/i)).toBeInTheDocument();
  });

  it('does NOT count from/to in active filter count on Pulse view', () => {
    mockFilters = { from: '2026-06-01', to: '2026-06-07', source: 'twitter' };
    render(<FilterBar activeView="pulse" />);
    // Only source should count; from + to are hidden on Pulse so they don't reset.
    expect(screen.getByText(/^Reset \(1\)$/)).toBeInTheDocument();
  });

  it('counts from/to in active filter count on non-Pulse views', () => {
    mockFilters = { from: '2026-06-01', to: '2026-06-07', source: 'twitter' };
    render(<FilterBar activeView="funnels" />);
    expect(screen.getByText(/^Reset \(3\)$/)).toBeInTheDocument();
  });

  it('defaults to non-Pulse behavior when activeView prop is omitted', () => {
    render(<FilterBar />);
    expect(screen.queryByText(/last 24h/i)).toBeNull();
  });
});
