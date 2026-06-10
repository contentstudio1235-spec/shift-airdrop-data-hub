import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WhaleWatch } from '../WhaleWatch';
import type { WhaleEvent } from '@/hooks/useWhaleStream';

const SAMPLE_EVENT: WhaleEvent = {
  type: 'open',
  wallet: 'AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdef12',
  walletDisplay: 'AbCd...ef12',
  source: 'Snag Referrals',
  asset: 'TSL2L',
  sizeUSD: 5000,
  openedAt: new Date(Date.now() - 90_000).toISOString(), // 1.5m ago
  isHistorical: true,
};

describe('WhaleWatch', () => {
  it('renders empty state when events=[]', () => {
    const { container } = render(
      <WhaleWatch events={[]} connected={true} error={null} />
    );
    expect(container.textContent).toContain('Watching for trades');
    // No event rows
    expect(container.querySelector('[aria-live="polite"] a')).toBeNull();
  });

  it('renders event row when given one event', () => {
    const { container } = render(
      <WhaleWatch events={[SAMPLE_EVENT]} connected={true} error={null} />
    );
    expect(container.textContent).toContain('AbCd...ef12');
    expect(container.textContent).toContain('TSL2L');
    // fmtUSD(5000) => $5.0K
    expect(container.textContent).toContain('$5.0K');
    expect(container.textContent).toContain('OPEN');
  });

  it('shows Reconnecting when connected=false', () => {
    const { container } = render(
      <WhaleWatch events={[SAMPLE_EVENT]} connected={false} error="disconnected" />
    );
    expect(container.textContent).toContain('Reconnecting');
    // Event still visible — no clear on disconnect
    expect(container.textContent).toContain('AbCd...ef12');
  });
});
