"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { TabHeader } from '@/components/DataHub/shared/TabHeader';

const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";

export function CohortsView() {
  // Stub view — no live data source yet. Mount time stands in for "last
  // updated" so the header pattern stays consistent across all tabs.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  const handleRefresh = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader
        title="Trader Cohorts"
        subtitle="Are recent signup cohorts performing better, worse, or the same as older ones? Retention and quality over time."
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />

      <div style={{ background: panel, border: `1px solid ${accentBorder}`, borderRadius: 16, backdropFilter: 'blur(12px)', padding: 48, textAlign: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Trader Cohorts — Sprint 3</div>
        <div style={{ color: '#3a7060', fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
          Whale Watch live ticker, retention heatmap, behavior segments, churn risk — all land in Sprint 3.
        </div>
      </div>
    </div>
  );
}
