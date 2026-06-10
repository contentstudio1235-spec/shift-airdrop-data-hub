"use client";
// ============================================================
// ReconciliationBadge — Phase 1 trust-floor visibility surface
//
// Tiny inline affordance next to a metric label: a check icon when the
// metric_id is listed in reconciliationCatalog's RECONCILED_METRIC_IDS.
// Communicates "this number has a second-source check" without taking
// layout space. Hover tooltip names the reconciliation test.
//
// Render nothing when metric_id is not in the catalog — explicit absence
// is also signal (this metric does NOT have a check).
// ============================================================

import React from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { isReconciled } from '@/lib/reconciliationCatalog';

export interface ReconciliationBadgeProps {
  metricId: string | undefined;
}

export function ReconciliationBadge({ metricId }: ReconciliationBadgeProps) {
  if (!isReconciled(metricId)) return null;
  return (
    <span
      title="Reconciled against second source"
      aria-label={`${metricId} reconciled against second source`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 4,
        color: TOKENS.accent,
        opacity: 0.7,
      }}
    >
      <CheckCircle size={11} weight="fill" />
    </span>
  );
}
