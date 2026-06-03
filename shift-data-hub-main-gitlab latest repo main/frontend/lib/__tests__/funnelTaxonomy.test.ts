import { describe, it, expect } from 'vitest';
import { FUNNEL_DISPLAY, getStepBenchmark, getThresholdsForKPI } from '../funnelTaxonomy';

describe('FUNNEL_DISPLAY', () => {
  it('contains all 7 funnels with 4 steps each', () => {
    const ids = ['acquisition','activation','conversion','whale_pipeline','loyalty','referral','retention'];
    expect(Object.keys(FUNNEL_DISPLAY).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(FUNNEL_DISPLAY[id as keyof typeof FUNNEL_DISPLAY].steps).toHaveLength(4);
    }
  });

  it('acquisition step 2 is Wallet Modal Open per Growth Hacker §1.1', () => {
    expect(FUNNEL_DISPLAY.acquisition.steps[1].name).toBe('Wallet Modal Open');
  });

  it('whale_pipeline step 1 is Holder ($100+) per Growth Hacker §1.4', () => {
    expect(FUNNEL_DISPLAY.whale_pipeline.steps[0].name).toBe('Holder ($100+)');
  });

  it('every funnel has a Phosphor Icon component', () => {
    for (const f of Object.values(FUNNEL_DISPLAY)) {
      expect(f.Icon).toBeDefined();
      expect(typeof f.Icon).toBe('object'); // forwardRef returns object
    }
  });
});

describe('getStepBenchmark', () => {
  it('returns the green benchmark for acquisition Landing → Modal Open', () => {
    expect(getStepBenchmark('acquisition', 1)?.green).toBe(15);
  });
  it('returns undefined for steps with no benchmark', () => {
    expect(getStepBenchmark('retention', 0)).toBeUndefined();
  });
});

describe('getThresholdsForKPI', () => {
  it('returns Analytics Reporter §2 hero thresholds for new_holders_7d_wow', () => {
    const t = getThresholdsForKPI('new_holders_7d_wow');
    expect(t).toEqual({ red: -10, yellow: -5, green: 10 });
  });
});
