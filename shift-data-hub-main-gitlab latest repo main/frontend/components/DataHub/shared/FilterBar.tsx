"use client";
import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { DateRangePicker } from './DateRangePicker';
import { SourcePicker } from './SourcePicker';
import { AssetPicker } from './AssetPicker';

const accent = "#00c896";
const accentBorder = "rgba(0,200,150,0.2)";
const accentDim = "rgba(0,200,150,0.15)";
const panel = "rgba(8,18,14,0.9)";

export interface FilterBarProps {
  /**
   * The currently active top-level view. When 'pulse', the date range picker
   * is replaced with a static "Last 24h" badge — PulseView is by design a
   * 24h-compare snapshot and its data hooks ignore from/to filters.
   * Source + asset filters stay visible on all views.
   */
  activeView?: string;
}

export function FilterBar({ activeView }: FilterBarProps = {}) {
  const [filters, update, reset] = useFilters();
  // Hide from/to from the active-count when we don't show the picker, so
  // "Reset (N)" doesn't claim filters the operator can't see.
  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (v === undefined || v === '') return false;
    if (activeView === 'pulse' && (k === 'from' || k === 'to')) return false;
    return true;
  }).length;

  const isPulse = activeView === 'pulse';

  return (
    <div style={{
      background: panel,
      border: `1px solid ${accentBorder}`,
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#3a7060', textTransform: 'uppercase' }}>
        Filters
      </span>
      {isPulse ? (
        <span
          title="Pulse is a 24h compare snapshot — date range is fixed by design"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: accentDim,
            color: accent,
            border: `1px solid ${accentBorder}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          Last 24h
        </span>
      ) : (
        <DateRangePicker
          from={filters.from} to={filters.to}
          onChange={next => update(next)}
        />
      )}
      <SourcePicker value={filters.source} onChange={v => update({ source: v })} />
      <AssetPicker value={filters.asset} onChange={v => update({ asset: v })} />
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {activeCount > 0 && (
          <button
            onClick={reset}
            style={{
              background: 'transparent',
              border: `1px solid ${accentBorder}`,
              color: accent,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
