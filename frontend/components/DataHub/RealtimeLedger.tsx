'use client';

import { StitchedProfile } from './types';

interface RealtimeLedgerProps {
  profiles: StitchedProfile[];
  loading: boolean;
}

function fmt(w: string) {
  if (!w || w.length < 10) return w;
  return `${w.slice(0, 4)}...${w.slice(-4)}`;
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return iso;
  }
}

function PointsBadge({ points }: { points: number }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: 'rgba(0,200,150,0.12)',
      border: '1px solid rgba(0,200,150,0.3)',
      borderRadius: '20px',
      padding: '3px 10px',
      fontSize: '12px', fontWeight: 700, color: '#00c896',
    }}>
      <span style={{ fontSize: '10px' }}>◆</span>
      {Number(points).toLocaleString()} PTS
    </div>
  );
}

const COL_STYLE: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  fontSize: '13px',
  whiteSpace: 'nowrap',
};

const TH_STYLE: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: '10.5px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  color: '#3a7060',
  borderBottom: '1px solid rgba(0,200,150,0.12)',
  whiteSpace: 'nowrap',
  textAlign: 'left' as const,
};

export function RealtimeLedger({ profiles, loading }: RealtimeLedgerProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
            <th style={TH_STYLE}>Timestamp</th>
            <th style={TH_STYLE}>Solana Wallet</th>
            <th style={TH_STYLE}>GA4 Client ID</th>
            <th style={TH_STYLE}>Activity</th>
            <th style={TH_STYLE}>Amount (USD)</th>
            <th style={TH_STYLE}>Snag Referral Code</th>
            <th style={{ ...TH_STYLE, textAlign: 'right' }}>Points Badge</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} style={COL_STYLE}>
                    <div style={{
                      height: '14px', borderRadius: '4px',
                      width: j === 0 ? '120px' : j === 1 ? '90px' : j === 2 ? '100px' : '70px',
                      background: 'linear-gradient(90deg, #111 25%, #1a2a20 50%, #111 75%)',
                      backgroundSize: '400px 100%',
                      animation: 'shimmer 1.4s ease infinite',
                    }} />
                  </td>
                ))}
              </tr>
            ))
          ) : profiles.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ ...COL_STYLE, textAlign: 'center', color: '#3a7060', padding: '48px' }}>
                No stitched identity records yet. Connect wallets on the frontend to begin mapping.
              </td>
            </tr>
          ) : (
            profiles.map((p, i) => (
              <tr
                key={p.wallet + i}
                style={{ transition: 'background 0.15s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,150,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...COL_STYLE, color: '#4a7060', fontFamily: 'monospace', fontSize: '12px' }}>
                  {fmtDate(p.updated_at)}
                </td>
                <td style={{ ...COL_STYLE, color: '#00c896', fontFamily: 'monospace', fontWeight: 600 }}>
                  {fmt(p.wallet)}
                </td>
                <td style={{ ...COL_STYLE, color: '#6b9e8e', fontFamily: 'monospace', fontSize: '12px' }}>
                  {p.ga_user_id || '—'}
                </td>
                <td style={COL_STYLE}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(0,200,150,0.08)',
                    border: '1px solid rgba(0,200,150,0.2)',
                    borderRadius: '20px', padding: '2px 10px',
                    fontSize: '11.5px', fontWeight: 600, color: '#00c896',
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00c896', animation: 'livePulse 2s ease infinite' }} />
                    wallet_linked
                  </span>
                </td>
                <td style={{ ...COL_STYLE, color: '#e0e0e0', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  ${Number(p.total_xp || 0).toLocaleString()}
                </td>
                <td style={COL_STYLE}>
                  {p.snag_custom_referral_code ? (
                    <span style={{
                      background: 'rgba(171,71,188,0.1)',
                      border: '1px solid rgba(171,71,188,0.25)',
                      color: '#ce93d8',
                      borderRadius: '20px', padding: '2px 10px',
                      fontSize: '11.5px', fontWeight: 600,
                    }}>
                      {p.snag_custom_referral_code}
                    </span>
                  ) : (
                    <span style={{ color: '#2a4a3e', fontSize: '12px' }}>organic</span>
                  )}
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'right' }}>
                  <PointsBadge points={p.snag_points || 0} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
