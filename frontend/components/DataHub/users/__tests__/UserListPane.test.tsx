import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { UserListPane } from '../UserListPane';
import type { ProfileSummary } from '@/hooks/useUsersList';

// JSDOM does not implement ResizeObserver — mock it globally for this suite
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const makeRow = (overrides: Partial<ProfileSummary> = {}): ProfileSummary => ({
  profileId: 'prof-001',
  primaryWallet: 'Ab3fXYZ12345678901234567890123456789012345',
  displayName: 'Alice',
  firstSeenAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  lastSeenAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  firstUtmSource: 'twitter',
  stitchedPct: 80,
  lifetimeVolumeUSD: 500,
  holdingsValueUSD: 0,
  holdings: 2,
  hasX: true,
  hasDiscord: false,
  ...overrides,
});

const DEFAULT_PROPS = {
  rows: [makeRow()],
  total: 1,
  page: 1,
  pageSize: 50,
  loading: false,
  error: null,
  selectedId: null,
  onSelect: vi.fn(),
  onPageChange: vi.fn(),
  sortBy: 'last_seen',
  sortDir: 'desc' as const,
  onSort: vi.fn(),
};

describe('UserListPane — SortableHeader', () => {
  it('renders 11 column labels in the pinned header (with VALUE)', () => {
    const { container } = render(<UserListPane {...DEFAULT_PROPS} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Wallet');
    expect(text).toContain('Name');
    expect(text).toContain('Volume');
    expect(text).toContain('Value');
    expect(text).toContain('First Seen');
    expect(text).toContain('Last Seen');
    expect(text).toContain('Hold');
    expect(text).toContain('X');
    expect(text).toContain('TG');
  });

  it('VOLUME header button fires onSort("volume") when clicked', () => {
    const onSort = vi.fn();
    const { container } = render(<UserListPane {...DEFAULT_PROPS} onSort={onSort} />);
    const buttons = Array.from(container.querySelectorAll('button'));
    const volumeBtn = buttons.find(b => b.textContent?.trim() === 'Volume');
    expect(volumeBtn).toBeTruthy();
    fireEvent.click(volumeBtn!);
    expect(onSort).toHaveBeenCalledWith('volume');
  });

  it('shows ArrowUp icon when active sort is "volume" asc', () => {
    const { container } = render(
      <UserListPane {...DEFAULT_PROPS} sortBy="volume" sortDir="asc" />
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    const volumeBtn = buttons.find(b => b.textContent?.includes('Volume'));
    expect(volumeBtn).toBeTruthy();
    expect(volumeBtn?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('shows ArrowDown icon when active sort is "last_seen" desc', () => {
    const { container } = render(
      <UserListPane {...DEFAULT_PROPS} sortBy="last_seen" sortDir="desc" />
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    const lsBtn = buttons.find(b => b.textContent?.includes('Last Seen'));
    expect(lsBtn).toBeTruthy();
    expect(lsBtn?.getAttribute('aria-sort')).toBe('descending');
  });

  it('inactive sortable columns have aria-sort="none"', () => {
    const { container } = render(
      <UserListPane {...DEFAULT_PROPS} sortBy="last_seen" sortDir="desc" />
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    const volumeBtn = buttons.find(b => b.textContent?.includes('Volume'));
    expect(volumeBtn?.getAttribute('aria-sort')).toBe('none');
  });

  it('WALLET and NAME columns render as static spans (not buttons)', () => {
    const { container } = render(<UserListPane {...DEFAULT_PROPS} />);
    const buttons = Array.from(container.querySelectorAll('button'));
    const walletBtn = buttons.find(b => b.textContent?.trim() === 'Wallet');
    const nameBtn = buttons.find(b => b.textContent?.trim() === 'Name');
    expect(walletBtn).toBeUndefined();
    expect(nameBtn).toBeUndefined();
  });

  it('HOLDINGS header is a sortable button', () => {
    const onSort = vi.fn();
    const { container } = render(<UserListPane {...DEFAULT_PROPS} onSort={onSort} />);
    const buttons = Array.from(container.querySelectorAll('button'));
    const holdBtn = buttons.find(b => b.textContent?.includes('Hold'));
    expect(holdBtn).toBeTruthy();
    fireEvent.click(holdBtn!);
    expect(onSort).toHaveBeenCalledWith('holdings');
  });

  it('FIRST SEEN header renders as a static span (not sortable)', () => {
    const { container } = render(<UserListPane {...DEFAULT_PROPS} />);
    const buttons = Array.from(container.querySelectorAll('button'));
    const firstSeenBtn = buttons.find(b => b.textContent?.includes('First Seen'));
    expect(firstSeenBtn).toBeUndefined();
    // Should be a span
    const text = container.textContent ?? '';
    expect(text).toContain('First Seen');
  });

  it('TG header renders as a static span (not sortable)', () => {
    const { container } = render(<UserListPane {...DEFAULT_PROPS} />);
    const buttons = Array.from(container.querySelectorAll('button'));
    const tgBtn = buttons.find(b => b.textContent?.trim() === 'TG');
    expect(tgBtn).toBeUndefined();
    const text = container.textContent ?? '';
    expect(text).toContain('TG');
  });

  it('renders loading skeleton when loading=true and rows=[]', () => {
    const { container } = render(
      <UserListPane {...DEFAULT_PROPS} rows={[]} loading={true} total={0} />
    );
    expect(container.innerHTML).toContain('shimmer');
  });
});
