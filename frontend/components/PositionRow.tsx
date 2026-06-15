import type { Position } from '@/lib/types';
import ProgressBar from './ProgressBar';
import { PnLBadge } from './PnLBadge';
import { PnLInfoTooltip } from './PnLInfoTooltip';
import { TokenLogo } from './TokenLogo';

interface PositionRowProps {
  position: Position;
}

export default function PositionRow({ position }: PositionRowProps) {
  const mult = position.currentMultiplier ?? 1.0;
  const progressPct = Math.min(100, ((mult - 1.0) / 2.0) * 100);
  const ticker = position.asset;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="position-row fade-in">
      {/* Asset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <TokenLogo symbol={ticker} size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-space)' }}>{ticker}</div>
          <div style={{ fontSize: 11, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>
            ${position.positionSizeUsd?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Weeks held */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          {position.weeksHeld ?? Math.floor((position.daysHeld ?? 0) / 7)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>wks</div>
      </div>

      {/* Multiplier */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            background: 'var(--brand-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {mult.toFixed(2)}x
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>mult</div>
      </div>

      {/* XP/week */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--mint)' }}>
          +{(position.xpPerWeek ?? 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>XP/wk</div>
      </div>

      {/* Progress toward next multiplier */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ProgressBar value={progressPct} height={5} />
        <div style={{ fontSize: 10, color: 'var(--text-mute)' }}>
          {position.progressionHook ?? `${mult.toFixed(1)}x → 3.0x`}
        </div>
      </div>
      </div>

      {/* P&L Row (if data available) */}
      {position.pnlUsd !== undefined && position.pnlPct !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 40,
            paddingRight: 16,
            paddingTop: 8,
            paddingBottom: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: '0 0 8px 8px',
            fontSize: 12,
            color: 'var(--text-mute)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>P&L</span>
            <PnLInfoTooltip variant="position" showIcon={true} />
          </div>
          <PnLBadge pnlUsd={position.pnlUsd} pnlPct={position.pnlPct} size="sm" />
        </div>
      )}
    </div>
  );
}
