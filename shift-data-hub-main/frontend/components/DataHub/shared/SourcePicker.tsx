"use client";
import React from 'react';

const accentBorder = "rgba(0,200,150,0.2)";

const SOURCES = ['direct', 'twitter', 'discord', 'telegram', 'reddit', 'kol', 'email'];

export function SourcePicker({
  value, onChange,
}: { value?: string; onChange: (next: string | undefined) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      style={selectStyle}
      aria-label="Source channel"
    >
      <option value="">All sources</option>
      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
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
