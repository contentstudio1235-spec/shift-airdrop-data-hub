"use client";
import React from 'react';
import { FUNNEL_WINDOWS, type FunnelWindow } from '@/hooks/useFilters';

/**
 * Segmented control for choosing the funnel time-window scope.
 *
 * Design synthesis (MR !29, see docs/superpowers/plans/2026-06-08-mr-29-funnel-window-selector.md):
 * - UX Researcher chose segmented control over dropdown — operator compares
 *   windows 3-5x per session, hidden state in a dropdown costs a click per comparison.
 * - Analytics Reporter chose "cohort window = conversion budget" — single value
 *   semantically meaning "users who entered in last N days AND had up to N days
 *   to convert."
 * - Product Manager required persistent visibility — operator must see active
 *   window before reading any number to absorb default-change surprises.
 *
 * Pill ordering follows operator mental model: shortest (most current) → longest.
 */

const WINDOW_LABELS: Record<FunnelWindow, string> = {
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  'all': 'All-time',
};

interface FunnelWindowSelectorProps {
  value: FunnelWindow;
  onChange: (next: FunnelWindow) => void;
}

export function FunnelWindowSelector({ value, onChange }: FunnelWindowSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Funnel time window"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 2,
        background: 'rgba(8,18,14,0.6)',
        border: '1px solid rgba(0,200,150,0.2)',
        borderRadius: 6,
      }}
    >
      {FUNNEL_WINDOWS.map((w) => {
        const selected = w === value;
        return (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => { if (!selected) onChange(w); }}
            style={{
              minWidth: 44,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3,
              border: 'none',
              borderRadius: 4,
              cursor: selected ? 'default' : 'pointer',
              background: selected ? '#00c896' : 'transparent',
              color: selected ? '#030d0a' : 'rgba(255,255,255,0.6)',
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            {WINDOW_LABELS[w]}
          </button>
        );
      })}
    </div>
  );
}
