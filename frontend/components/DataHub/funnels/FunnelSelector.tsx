"use client";
import React from 'react';
import { FUNNEL_DISPLAY, type FunnelId } from '@/lib/funnelTaxonomy';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface FunnelSelectorProps {
  active: FunnelId;
  onChange: (id: FunnelId) => void;
}

const FUNNEL_IDS: FunnelId[] = [
  'acquisition','activation','conversion','whale_pipeline','loyalty','referral','retention',
];

export function FunnelSelector({ active, onChange }: FunnelSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      background: 'rgba(0,0,0,0.3)',
      padding: 4,
      borderRadius: 10,
      border: `1px solid ${TOKENS.accentBorder}`,
      flexWrap: 'wrap',
    }}>
      {FUNNEL_IDS.map(id => {
        const f = FUNNEL_DISPLAY[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              background: isActive ? TOKENS.accentDim : 'transparent',
              color: isActive ? TOKENS.accent : TOKENS.textMuted,
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              gap: 5,
              alignItems: 'center',
              fontFamily: 'inherit',
              transition: `all ${MOTION.fast}`,
            }}
          >
            <f.Icon weight="regular" size={14} />
            <span>{f.name}</span>
          </button>
        );
      })}
    </div>
  );
}
