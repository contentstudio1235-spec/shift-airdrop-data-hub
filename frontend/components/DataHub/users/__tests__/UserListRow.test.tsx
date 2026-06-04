import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { UserListRow } from '../UserListRow';
import type { ProfileSummary } from '@/hooks/useUsersList';

const BASE_ROW: ProfileSummary = {
  profileId: 'prof-001',
  primaryWallet: 'Ab3fXYZ12345678901234567890123456789012345',
  displayName: 'TestUser',
  firstSeenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30d ago
  lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
  firstUtmSource: 'twitter',
  stitchedPct: 75,
  lifetimeVolumeUSD: 1250.5,
  holdings: 3,
  hasX: true,
  hasDiscord: false,
};

describe('UserListRow', () => {
  it('renders fill TwitterLogo (X linked) when hasX=true', () => {
    const { container } = render(
      <UserListRow
        row={BASE_ROW}
        isSelected={false}
        onClick={vi.fn()}
        style={{}}
      />
    );
    const xBadge = container.querySelector('[aria-label="X linked"]');
    expect(xBadge).toBeTruthy();
    // fill weight renders with aria-label "X linked"
    expect(xBadge?.getAttribute('aria-label')).toBe('X linked');
  });

  it('renders regular TwitterLogo (X not linked) when hasX=false', () => {
    const { container } = render(
      <UserListRow
        row={{ ...BASE_ROW, hasX: false }}
        isSelected={false}
        onClick={vi.fn()}
        style={{}}
      />
    );
    const xBadge = container.querySelector('[aria-label="X not linked"]');
    expect(xBadge).toBeTruthy();
    expect(xBadge?.getAttribute('aria-label')).toBe('X not linked');
  });

  it('Telegram badge is always "Telegram not linked" regardless of row data', () => {
    // hasX + hasDiscord both true — TG must still show not-linked
    const { container } = render(
      <UserListRow
        row={{ ...BASE_ROW, hasX: true, hasDiscord: true }}
        isSelected={false}
        onClick={vi.fn()}
        style={{}}
      />
    );
    const tgBadge = container.querySelector('[aria-label="Telegram not linked"]');
    expect(tgBadge).toBeTruthy();
    // Confirm there is no "Telegram linked" badge
    expect(container.querySelector('[aria-label="Telegram linked"]')).toBeNull();
  });

  it('selected state applies 2px accent left border via inline style', () => {
    const { container } = render(
      <UserListRow
        row={BASE_ROW}
        isSelected={true}
        onClick={vi.fn()}
        style={{}}
      />
    );
    const row = container.firstChild as HTMLElement;
    // JSDOM normalizes #00c896 → rgb(0, 200, 150)
    expect(row.style.borderLeft).toContain('2px solid');
    expect(row.style.borderLeft).toMatch(/rgb\(0,\s*200,\s*150\)/);
  });

  it('renders wallet address in truncated form', () => {
    const { container } = render(
      <UserListRow
        row={BASE_ROW}
        isSelected={false}
        onClick={vi.fn()}
        style={{}}
      />
    );
    // fmtWallet truncates with ASCII ellipsis: Ab3f...XXXX
    expect(container.textContent).toContain('...');
  });

  it('renders dim dash for displayName when null', () => {
    const { container } = render(
      <UserListRow
        row={{ ...BASE_ROW, displayName: null }}
        isSelected={false}
        onClick={vi.fn()}
        style={{}}
      />
    );
    expect(container.textContent).toContain('—');
  });

  it('Discord badge shows linked state when hasDiscord=true', () => {
    const { container } = render(
      <UserListRow
        row={{ ...BASE_ROW, hasDiscord: true }}
        isSelected={false}
        onClick={vi.fn()}
        style={{}}
      />
    );
    const discordBadge = container.querySelector('[aria-label="Discord linked"]');
    expect(discordBadge).toBeTruthy();
  });
});
