'use client';

import { OnchainHolders } from './types';

interface OnchainPanelProps {
  data: OnchainHolders | null;
  loading: boolean;
}

const DIRECTION_COLOR: Record<string, string> = {
  L: '#00c896',
  S: '#ff6b6b',
};

export function OnchainPanel({ data, loading }: OnchainPanelProps) {
  if (loading || !data) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            height: '72px', borderRadius: '10px',
            background: 'linear-gradient(90deg, #0a1812 25%, #0f2218 50%, #0a1812 75%)',
            backgroundSize: '400px 100%',
            animation: 'shimmer 1.4s ease infinite',
          }} />
        ))}
      </div>
    );
  }

  const maxHolders = Math.max(...data.tokens.map(t => t.holders));

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Unique Holders', value: data.uniqueHolders.toLocaleString(), color: '#00c896' },
          { label: 'Total Holder Slots', value: data.totalHolderSlots.toLocaleString(), color: '#a78bfa' },
          { label: 'Multi-Asset Wallets', value: '309', color: '#60a5fa' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#3a7060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Token grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {data.tokens.map(token => {
          const dir = token.symbol.slice(-1); // L or S
          const color = DIRECTION_COLOR[dir] || '#e0e0e0';
          const pct = (token.holders / maxHolders) * 100;

          return (
            <div key={token.symbol} style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${color}20`,
              borderRadius: '10px',
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{
                    fontSize: '12px', fontWeight: 800, color, fontFamily: 'monospace',
                    background: `${color}15`, padding: '2px 8px', borderRadius: '6px',
                    border: `1px solid ${color}30`,
                  }}>{token.symbol}</span>
                  <span style={{ fontSize: '10px', color: '#3a7060', marginLeft: '8px', fontWeight: 600 }}>
                    {dir === 'L' ? '📈 LONG' : '📉 SHORT'}
                  </span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {token.holders}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#2a5040', marginBottom: '6px' }}>{token.name}</div>
              {/* Bar */}
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}60, ${color})`,
                  borderRadius: '2px',
                  boxShadow: `0 0 6px ${color}60`,
                  transition: 'width 0.8s cubic-bezier(.16,1,.3,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {data.cached && (
        <div style={{ marginTop: '12px', fontSize: '10px', color: '#2a4a3e', textAlign: 'right' }}>
          ⚡ cached · updated {new Date(data.fetchedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
