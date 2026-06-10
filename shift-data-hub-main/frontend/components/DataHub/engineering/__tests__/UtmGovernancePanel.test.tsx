import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { UtmViolation } from '@/hooks/useUtmViolations';
import type { Campaign } from '@/hooks/useCampaigns';

// ──────────────────────────────────────────────────────────────────────────────
// Shared mock state — the panel's 3 hooks are mocked so each test can swap the
// underlying data without spinning up a real fetch layer.
// ──────────────────────────────────────────────────────────────────────────────

interface MockState {
  violations: UtmViolation[];
  campaigns: Campaign[];
  sources: string[];
  mediums: string[];
  approvedLoading: boolean;
  violationsLoading: boolean;
  campaignsLoading: boolean;
  createSpy: ReturnType<typeof vi.fn>;
  refetchSpy: ReturnType<typeof vi.fn>;
}

const state: MockState = {
  violations: [],
  campaigns: [],
  sources: ['twitter', 'discord', 'cobie'],
  mediums: ['paid-social', 'kol', 'referral'],
  approvedLoading: false,
  violationsLoading: false,
  campaignsLoading: false,
  createSpy: vi.fn(),
  refetchSpy: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/hooks/useUtmViolations', () => ({
  useUtmViolations: () => ({
    data: state.violationsLoading ? null : { violations: state.violations },
    loading: state.violationsLoading,
    error: null,
    refetch: state.refetchSpy,
  }),
}));

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({
    data: state.campaignsLoading ? null : { campaigns: state.campaigns },
    loading: state.campaignsLoading,
    error: null,
    refetch: state.refetchSpy,
    create: state.createSpy,
  }),
}));

vi.mock('@/hooks/useApprovedUtmValues', () => ({
  useApprovedUtmValues: () => ({
    sources: state.sources,
    mediums: state.mediums,
    loading: state.approvedLoading,
    error: null,
    refetch: state.refetchSpy,
  }),
}));

beforeAll(() => {
  // Some primitives (DialogShell + portals) rely on ResizeObserver in newer libs.
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  state.violations = [];
  state.campaigns = [];
  state.sources = ['twitter', 'discord', 'cobie'];
  state.mediums = ['paid-social', 'kol', 'referral'];
  state.approvedLoading = false;
  state.violationsLoading = false;
  state.campaignsLoading = false;
  state.createSpy = vi.fn(() => Promise.resolve({ ok: true, campaign: {} as Campaign }));
  state.refetchSpy = vi.fn();
});

// Import after mocks register
import { UtmGovernancePanel } from '../UtmGovernancePanel';

const buildCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: 1,
  createdAt: new Date().toISOString(),
  createdBy: 'tomer',
  displayName: 'Cobie pinned tweet',
  destinationUrl: 'https://shiftrwa.xyz/register',
  utmSource: 'cobie',
  utmMedium: 'kol',
  utmCampaign: 'tsl2l-launch-2026q2',
  utmContent: null,
  utmTerm: null,
  notes: null,
  budgetUSD: null,
  expectedReach: null,
  fullUrl: 'https://shiftrwa.xyz/register?utm_source=cobie&utm_medium=kol&utm_campaign=tsl2l-launch-2026q2',
  shortUrl: null,
  isArchived: false,
  ...overrides,
});

const buildViolation = (overrides: Partial<UtmViolation> = {}): UtmViolation => ({
  id: 1,
  occurredAt: new Date().toISOString(),
  profileId: null,
  rawUrl: 'https://shiftrwa.xyz/?utm_source=Trust_iOS_Browser',
  rejectedField: 'utm_source',
  rejectedValue: 'Trust_iOS_Browser',
  reason: 'user-agent',
  ...overrides,
});

describe('UtmGovernancePanel', () => {
  it('renders the three KPI cards', () => {
    state.campaigns = [buildCampaign()];
    const { getByTestId } = render(<UtmGovernancePanel />);

    const kpiRow = getByTestId('utm-kpi-row');
    expect(kpiRow).toBeInTheDocument();
    expect(kpiRow.children.length).toBe(3);
    // Each KPI card surfaces its label inside the row.
    expect(kpiRow.textContent).toMatch(/Violations · 7d/i);
    expect(kpiRow.textContent).toMatch(/Active Campaigns/i);
    expect(kpiRow.textContent).toMatch(/Approved Values/i);
  });

  it('shows the empty state when there are no campaigns', () => {
    state.campaigns = [];
    const { getByText } = render(<UtmGovernancePanel />);
    expect(getByText(/No campaigns logged yet/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no violations', () => {
    state.violations = [];
    const { getByText } = render(<UtmGovernancePanel />);
    expect(getByText(/No violations in the last 7 days/i)).toBeInTheDocument();
  });

  it('opens the Campaign Builder dialog when "Add Campaign" is clicked', async () => {
    const { getByTestId, findByText } = render(<UtmGovernancePanel />);
    const button = getByTestId('add-campaign-btn');
    fireEvent.click(button);
    expect(await findByText(/Build Campaign URL/i)).toBeInTheDocument();
  });

  it('keeps the dialog Save button disabled until required fields are filled', async () => {
    const { getByTestId, findByTestId } = render(<UtmGovernancePanel />);
    fireEvent.click(getByTestId('add-campaign-btn'));

    const submit = (await findByTestId('submit-campaign')) as HTMLButtonElement;
    expect(submit).toBeDisabled();

    // Ensure the disabled state survives at least one render flush.
    await waitFor(() => expect(submit).toBeDisabled());
    expect(state.createSpy).not.toHaveBeenCalled();
  });

  // Bonus: confirm a violation row renders all key info.
  it('renders violation rows with field, value, and reason', () => {
    state.violations = [buildViolation()];
    const { getByText } = render(<UtmGovernancePanel />);
    expect(getByText(/utm_source=Trust_iOS_Browser/)).toBeInTheDocument();
    expect(getByText(/reason: user-agent/)).toBeInTheDocument();
  });
});
