import type { Position } from '@/lib/types';
import ProgressBar from './ProgressBar';

interface PositionRowProps {
  position: Position;
}

export default function PositionRow({ position }: PositionRowProps) {
  const mult = position.currentMultiplier ?? 1.0;
  const progressPct = Math.min(100, ((mult - 1.0) / 2.0) * 100);
  const ticker = position.asset;
  const initials = ticker.slice(0, 3).toUpperCase();

  return (
    <div className="position-row fade-in">
      {/* Asset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div className="asset-logo">{initials}</div>
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
  );
}
