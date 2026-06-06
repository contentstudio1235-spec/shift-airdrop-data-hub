import { describe, it, expect } from 'vitest';
import { isReconciled, RECONCILED_METRIC_IDS } from '../reconciliationCatalog';
import { HUB_METRIC_IDS } from '../hubMetricIds';

describe('reconciliationCatalog', () => {
  it('marks pulse.registeredUsers as reconciled', () => {
    expect(isReconciled(HUB_METRIC_IDS.PULSE_REGISTERED_USERS)).toBe(true);
  });

  it('marks pulse.activeHolders / aumUSD / openWhales as reconciled', () => {
    expect(isReconciled(HUB_METRIC_IDS.PULSE_ACTIVE_HOLDERS)).toBe(true);
    expect(isReconciled(HUB_METRIC_IDS.PULSE_AUM_USD)).toBe(true);
    expect(isReconciled(HUB_METRIC_IDS.PULSE_OPEN_WHALES)).toBe(true);
  });

  it('marks cohorts.retentionWeek4 as reconciled', () => {
    expect(isReconciled(HUB_METRIC_IDS.COHORTS_RETENTION_W4)).toBe(true);
  });

  it('returns false for unknown metric ids', () => {
    expect(isReconciled('does.not.exist')).toBe(false);
    expect(isReconciled(undefined)).toBe(false);
    expect(isReconciled('')).toBe(false);
  });

  it('the catalog has exactly 5 reconciled metrics in Phase 1', () => {
    expect(RECONCILED_METRIC_IDS.size).toBe(5);
  });
});
