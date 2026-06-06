// ============================================================
// SHIFT RWA Data Hub — Reconciliation Catalog
//
// Single source of truth for which Hub metric_ids have a passing
// second-source reconciliation test in src/services/__tests__/reconciliation/.
// Operators see a check icon next to these metrics via <ReconciliationBadge/>.
//
// To extend: add the HUB_METRIC_IDS constant and reference the test file.
// Removing an entry silently hides the badge — keep this list in sync
// with the actual test catalog.
// ============================================================

import { HUB_METRIC_IDS } from './hubMetricIds';

export const RECONCILED_METRIC_IDS = new Set<string>([
  HUB_METRIC_IDS.PULSE_REGISTERED_USERS,  // registeredUsers.test.ts
  HUB_METRIC_IDS.PULSE_ACTIVE_HOLDERS,    // activeHolders.test.ts
  HUB_METRIC_IDS.PULSE_AUM_USD,           // aumUSD.test.ts
  HUB_METRIC_IDS.PULSE_OPEN_WHALES,       // whaleEvents.test.ts
  HUB_METRIC_IDS.COHORTS_RETENTION_W4,    // cohortRetention.test.ts
]);

export function isReconciled(metricId: string | undefined): boolean {
  if (!metricId) return false;
  return RECONCILED_METRIC_IDS.has(metricId);
}
