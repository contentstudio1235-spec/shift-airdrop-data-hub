"use client";
import React, { useState } from 'react';
import type { Filters } from '@/hooks/useFilters';
import { useInsightStrip } from '@/hooks/useInsightStrip';
import { InsightCard } from './InsightCard';
import { TOKENS } from '@/lib/chartTokens';

export function InsightStrip({ filters }: { filters: Filters }) {
  const insights = useInsightStrip(filters);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = insights.filter(i => !dismissed.has(i.id));

  if (visible.length === 0) {
    return (
      <div style={{
        padding: 12,
        background: TOKENS.panel,
        border: `1px solid ${TOKENS.accentBorder}`,
        borderRadius: 12,
        backdropFilter: `blur(${TOKENS.glassBlur})`,
        WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
        textAlign: 'center',
        color: TOKENS.textMuted,
        fontSize: 12,
      }}>
        All KPIs within expected bands
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      paddingBottom: 4,
      scrollSnapType: 'x mandatory',
    }}>
      {visible.map(insight => (
        <InsightCard
          key={insight.id}
          text={insight.text}
          priority={insight.priority}
          onDismiss={() => setDismissed(d => new Set(d).add(insight.id))}
        />
      ))}
    </div>
  );
}
