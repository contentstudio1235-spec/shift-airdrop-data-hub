import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AnimatedFunnel } from '../AnimatedFunnel';

describe('AnimatedFunnel', () => {
  it('renders 4 step bars when given 4 steps (using taxonomy display names)', () => {
    const steps = [
      { id: 'visit',       name: 'visit',       count: 100, conversionFromPrev: 100, conversionFromFirst: 100, vs7dDelta: 0 },
      { id: 'landing',     name: 'landing',     count: 60,  conversionFromPrev: 60,  conversionFromFirst: 60,  vs7dDelta: 0 },
      { id: 'connect',     name: 'connect',     count: 30,  conversionFromPrev: 50,  conversionFromFirst: 30,  vs7dDelta: 0 },
      { id: 'first_trade', name: 'first_trade', count: 10,  conversionFromPrev: 33,  conversionFromFirst: 10,  vs7dDelta: 0 },
    ] satisfies Array<{ id: string; name: string; count: number; conversionFromPrev: number; conversionFromFirst: number; vs7dDelta: number }>;
    const { container } = render(<AnimatedFunnel funnelId="acquisition" steps={steps} />);
    for (const expected of ['Landing', 'Wallet Modal Open', 'Wallet Connect', 'First Trade']) {
      expect(container.textContent).toContain(expected);
    }
  });
});
