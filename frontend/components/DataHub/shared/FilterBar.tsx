"use client";
import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { DateRangePicker } from './DateRangePicker';
import { SourcePicker } from './SourcePicker';
import { AssetPicker } from './AssetPicker';

const accent = "#00c896";
const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";

export function FilterBar() {
  const [filters, update, reset] = useFilters();
  const activeCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

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
      <DateRangePicker
        from={filters.from} to={filters.to}
        onChange={next => update(next)}
      />
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
