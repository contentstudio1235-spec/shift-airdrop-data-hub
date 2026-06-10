import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WhaleSankey } from '../WhaleSankey';
import type { WhaleOriginsPayload } from '@/hooks/useWhaleOrigins';

const BELOW_THRESHOLD_DATA: WhaleOriginsPayload = {
  nodes: [
    { id: 'src1', label: 'UTM', kind: 'source', value: 5 },
    { id: 'coh1', label: 'Dolphin', kind: 'cohort', value: 5 },
    { id: 'out1', label: 'Active', kind: 'outcome', value: 5 },
  ],
  edges: [
    { from: 'src1', to: 'coh1', value: 5 },
    { from: 'coh1', to: 'out1', value: 5 },
  ],
  totals: { sourceUsers: 5, whales: 2, whaleVolumeUSD: 1000 },
  computedAt: '2026-06-04T00:00:00Z',
  dataQuality: 'good',
};

const ABOVE_THRESHOLD_DATA: WhaleOriginsPayload = {
  nodes: [
    { id: 'src1', label: 'UTM', kind: 'source', value: 80 },
    { id: 'src2', label: 'Snag', kind: 'source', value: 40 },
    { id: 'coh1', label: 'Whale', kind: 'cohort', value: 60 },
    { id: 'coh2', label: 'Dolphin', kind: 'cohort', value: 60 },
    { id: 'out1', label: 'Active', kind: 'outcome', value: 70 },
    { id: 'out2', label: 'Dormant', kind: 'outcome', value: 30 },
    { id: 'out3', label: 'Churned', kind: 'outcome', value: 20 },
  ],
  edges: [
    { from: 'src1', to: 'coh1', value: 50 },
    { from: 'src1', to: 'coh2', value: 30 },
    { from: 'src2', to: 'coh2', value: 30 },
    { from: 'coh1', to: 'out1', value: 40 },
    { from: 'coh1', to: 'out2', value: 10 },
    { from: 'coh1', to: 'out3', value: 10 },
    { from: 'coh2', to: 'out1', value: 30 },
    { from: 'coh2', to: 'out2', value: 20 },
    { from: 'coh2', to: 'out3', value: 10 },
  ],
  totals: { sourceUsers: 120, whales: 60, whaleVolumeUSD: 500000 },
  computedAt: '2026-06-04T00:00:00Z',
  dataQuality: 'good',
};

describe('WhaleSankey', () => {
  it('renders empty state when sourceUsers < 20', () => {
    const { container } = render(
      <WhaleSankey data={BELOW_THRESHOLD_DATA} loading={false} error={null} />
    );
    expect(container.textContent).toContain('Sankey needs at least 20 attributed users');
    expect(container.textContent).toContain('current: 5');
    // No SVG node rects (graph not rendered)
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeNull();
  });

  it('renders SVG with node labels when above threshold', () => {
    const { container } = render(
      <WhaleSankey data={ABOVE_THRESHOLD_DATA} loading={false} error={null} />
    );
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    // Should have node label text for our nodes
    expect(container.textContent).toContain('UTM');
    expect(container.textContent).toContain('WHALE');
    expect(container.textContent).toContain('ACTIVE');
    // Whale count in header
    expect(container.textContent).toContain('60');
  });
});
