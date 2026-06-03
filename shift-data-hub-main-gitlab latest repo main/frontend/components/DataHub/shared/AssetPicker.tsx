"use client";
import React from 'react';

const accentBorder = "rgba(0,200,150,0.2)";

const ASSETS = ['TSL2L', 'TSL1S', 'SOX3L', 'SOX3S', 'SPX3L', 'SPX3S'];

export function AssetPicker({
  value, onChange,
}: { value?: string; onChange: (next: string | undefined) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      style={selectStyle}
      aria-label="Asset"
    >
      <option value="">All assets</option>
      {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${accentBorder}`,
  borderRadius: 8,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};
