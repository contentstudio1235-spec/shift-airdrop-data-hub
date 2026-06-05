import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KPICard } from '../KPICard';

describe('KPICard', () => {
  it('renders the label and the formatted value', () => {
    const { getByText } = render(
      <KPICard label="Registered Users" value={15455} />,
    );
    expect(getByText('Registered Users')).toBeTruthy();
    // Default formatter is toLocaleString()
    expect(getByText((15455).toLocaleString())).toBeTruthy();
  });

  it('uses a custom formatter when provided', () => {
    const { getByText } = render(
      <KPICard
        label="AUM"
        value={13700}
        formatValue={(n) => `$${(n / 1000).toFixed(1)}K`}
      />,
    );
    expect(getByText('$13.7K')).toBeTruthy();
  });

  it('shows a green up arrow when delta is positive and positiveIsGood (default)', () => {
    const { container } = render(
      <KPICard
        label="Users"
        value={1000}
        delta={173}
        deltaPct={1.04}
      />,
    );
    // Phosphor renders SVG icons; assert an SVG is present in the delta chip
    expect(container.querySelector('svg')).toBeTruthy();
    // The numeric delta and pct should appear, with the explicit + sign
    expect(container.textContent).toContain('+173');
    expect(container.textContent).toContain('+1.04%');
  });

  it('shows a red down arrow when delta is negative and positiveIsGood (default)', () => {
    const { container } = render(
      <KPICard
        label="Users"
        value={1000}
        delta={-5}
        deltaPct={-0.42}
      />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.textContent).toContain('−5');
    expect(container.textContent).toContain('−0.42%');
  });

  it('renders nothing for the delta chip when delta is null', () => {
    const { container } = render(
      <KPICard
        label="Users"
        value={1000}
        delta={null}
        deltaPct={null}
      />,
    );
    // No "+0" placeholder, no percent text
    expect(container.textContent).not.toContain('%');
    // No SVG icon in this card (no Phosphor delta arrow, no provided label icon)
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders nothing for the delta chip when delta is undefined', () => {
    const { container } = render(
      <KPICard label="Users" value={1000} />,
    );
    expect(container.textContent).not.toContain('%');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('does not render percent suffix when deltaPct is null but delta is present', () => {
    const { container } = render(
      <KPICard
        label="Users"
        value={1000}
        delta={42}
        deltaPct={null}
      />,
    );
    expect(container.textContent).toContain('+42');
    expect(container.textContent).not.toContain('%');
  });
});
