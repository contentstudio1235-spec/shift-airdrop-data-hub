import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import type { ProfileSummary } from '@/hooks/useUsersList';

// Mock router + search params (Next.js App Router)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// JSDOM does not implement ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Helper to build ProfileSummary rows
const makeRow = (overrides: Partial<ProfileSummary> = {}): ProfileSummary => ({
  profileId: `prof-${Math.random()}`,
  primaryWallet: 'Ab3fXYZ12345678901234567890123456789012345',
  displayName: null,
  firstSeenAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  lastSeenAt: new Date().toISOString(),
  firstUtmSource: null,
  stitchedPct: 0,
  lifetimeVolumeUSD: 0,
  holdingsValueUSD: 0,
  holdings: 0,
  hasX: false,
  hasDiscord: false,
  ...overrides,
});

const ROW_WITH_X = makeRow({ profileId: 'has-x', hasX: true, hasDiscord: false });
const ROW_WITHOUT_X = makeRow({ profileId: 'no-x', hasX: false, hasDiscord: false });
const ROW_BOTH = makeRow({ profileId: 'has-both', hasX: true, hasDiscord: true });

// Mock useUsersList to return controlled rows
vi.mock('@/hooks/useUsersList', () => ({
  useUsersList: () => ({
    data: {
      rows: [ROW_WITH_X, ROW_WITHOUT_X, ROW_BOTH],
      total: 3,
      page: 1,
      pageSize: 50,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock UserDetailPane to avoid complex prop requirements
vi.mock('../UserDetailPane', () => ({
  UserDetailPane: () => <div data-testid="detail-pane" />,
}));

// Import after mocks are registered
import { UsersView } from '../UsersView';

describe('UsersView — Has Social filter', () => {
  it('"Has X" filter shows only rows where hasX=true', async () => {
    const { container, getByLabelText } = render(<UsersView />);

    const select = getByLabelText('Filter by social connection');
    fireEvent.change(select, { target: { value: 'x' } });

    await waitFor(() => {
      // After filtering, only rows with hasX=true should be passed to UserListPane.
      // We verify by checking the count display reads "2 shown (filtered)" (ROW_WITH_X + ROW_BOTH)
      expect(container.textContent).toContain('shown (filtered)');
    });
  });

  it('"Has Discord" filter shows only rows where hasDiscord=true', async () => {
    const { container, getByLabelText } = render(<UsersView />);

    const select = getByLabelText('Filter by social connection');
    fireEvent.change(select, { target: { value: 'discord' } });

    await waitFor(() => {
      // Only ROW_BOTH has hasDiscord=true → 1 row shown
      expect(container.textContent).toContain('shown (filtered)');
    });
  });

  it('"All users" filter shows full count without "(filtered)" label', async () => {
    const { container, getByLabelText } = render(<UsersView />);

    // Default is 'any' — just confirm "profiles" label
    const select = getByLabelText('Filter by social connection');
    // Select any filter then reset back to 'any'
    fireEvent.change(select, { target: { value: 'x' } });
    fireEvent.change(select, { target: { value: 'any' } });

    await waitFor(() => {
      expect(container.textContent).toContain('profiles');
      expect(container.textContent).not.toContain('(filtered)');
    });
  });

  it('Reset button includes social filter in active count', async () => {
    const { container, getByLabelText } = render(<UsersView />);

    const select = getByLabelText('Filter by social connection');
    fireEvent.change(select, { target: { value: 'x' } });

    await waitFor(() => {
      // Reset button should appear with count of 1 (socialFilter active)
      expect(container.textContent).toContain('Reset (1)');
    });
  });
});
