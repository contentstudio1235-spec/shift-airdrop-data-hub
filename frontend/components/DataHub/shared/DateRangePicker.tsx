"use client";
import React from 'react';

const accentBorder = "rgba(0,200,150,0.2)";

export function DateRangePicker({
  from, to, onChange,
}: { from?: string; to?: string; onChange: (next: { from?: string; to?: string }) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="date" value={from ?? ''}
        onChange={e => onChange({ from: e.target.value || undefined })}
        style={inputStyle}
        aria-label="From date"
      />
      <span style={{ color: '#3a7060', fontSize: 12 }}>→</span>
      <input
        type="date" value={to ?? ''}
        onChange={e => onChange({ to: e.target.value || undefined })}
        style={inputStyle}
        aria-label="To date"
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: `1px solid ${accentBorder}`,
  borderRadius: 8,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  colorScheme: 'dark',
};
