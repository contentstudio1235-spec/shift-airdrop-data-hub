"use client";
import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';

export interface KPICardProps {
  /** UPPERCASE label rendered at the top, e.g. "Registered Users". */
  label: string;
  /** Current numeric value. */
  value: number;
  /** Custom formatter; defaults to `toLocaleString()`. */
  formatValue?: (n: number) => string;
  /** Absolute change vs 24h ago. `null` hides the delta chip entirely. */
  delta?: number | null;
  /** Percentage change vs 24h ago, in human units (e.g. 1.04 → "+1.04%"). */
  deltaPct?: number | null;
  /**
   * When true (default), positive delta is green / negative is red.
   * Set to false for metrics where direction is neutral (e.g. whale count —
   * more whales isn't strictly "better", so we want a calm color, not red/green).
   */
  positiveIsGood?: boolean;
  /** Optional Phosphor icon rendered next to the label. */
  icon?: React.ReactNode;
  /**
   * Optional native HTML `title` tooltip applied to the card's outer wrapper.
   * Used to surface the precise formula behind a metric on hover, e.g. the
   * "Identity Links" card explains it counts profiles with ≥2 identity links.
   * When undefined, no `title` attribute is rendered (default behavior).
   */
  tooltip?: string;
}

const defaultFormatValue = (n: number) => n.toLocaleString();

/**
 * Format a delta number with explicit sign and locale formatting.
 * Handles zero by treating it as "+0" so the chip remains symmetric.
 */
function formatDelta(n: number): string {
  if (n > 0) return `+${n.toLocaleString()}`;
  if (n < 0) return `${'−'}${Math.abs(n).toLocaleString()}`;
  return '+0';
}

/**
 * Format a percentage with explicit sign, e.g. 1.04 → "+1.04%".
 */
function formatDeltaPct(pct: number): string {
  if (pct > 0) return `+${pct.toFixed(2)}%`;
  if (pct < 0) return `${'−'}${Math.abs(pct).toFixed(2)}%`;
  return '+0.00%';
}

/**
 * KPICard — single hero metric card for the Pulse view.
 *
 * Visual contract:
 *   - 120px tall, full-width inside its grid column
 *   - Glass panel with backdrop blur and 1px accentBorder
 *   - Border transitions to accent on hover (120ms)
 *   - Big tabular-nums value, small uppercase label, optional delta chip
 *
 * Accessibility:
 *   - Label and value rendered as plain text (no aria roles — the grid
 *     above is presentational; screen readers read each card linearly)
 *   - Delta chip carries an aria-label like "+173 (+1.04%) up" so the
 *     direction is announced unambiguously
 */
export function KPICard({
  label,
  value,
  formatValue = defaultFormatValue,
  delta,
  deltaPct,
  positiveIsGood = true,
  icon,
  tooltip,
}: KPICardProps) {
  const [hover, setHover] = useState(false);

  // Determine the chip's directional state.
  // Treat exactly zero deltas as "flat" — show without color emphasis.
  const hasDelta = delta !== undefined && delta !== null;
  let deltaColor: string = TOKENS.textMuted;
  let DeltaIcon: typeof ArrowUp | null = null;
  let directionLabel = 'flat';

  if (hasDelta && delta !== 0) {
    const isPositive = delta > 0;
    DeltaIcon = isPositive ? ArrowUp : ArrowDown;
    directionLabel = isPositive ? 'up' : 'down';
    if (positiveIsGood) {
      deltaColor = isPositive ? TOKENS.threshold.green : TOKENS.threshold.red;
    } else {
      // Neutral direction — surface change but don't color-code as good/bad.
      deltaColor = TOKENS.textSecondary;
    }
  }

  const containerStyle: React.CSSProperties = {
    height: 120,
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 16px',
    background: TOKENS.panel,
    border: `1px solid ${hover ? TOKENS.accent : TOKENS.accentBorder}`,
    borderRadius: 12,
    backdropFilter: `blur(${TOKENS.glassBlur})`,
    WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: `border-color ${MOTION.fast}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
    overflow: 'hidden',
  };

  const labelRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    color: TOKENS.textFaint,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 800,
    color: TOKENS.textPrimary,
    lineHeight: 1.0,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const deltaChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 700,
    color: deltaColor,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.2,
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tooltip}
    >
      <div style={labelRowStyle}>
        {icon && <span aria-hidden style={{ display: 'inline-flex' }}>{icon}</span>}
        <span>{label}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={valueStyle}>{formatValue(value)}</div>

        {hasDelta && (
          <div
            style={deltaChipStyle}
            aria-label={
              delta === 0
                ? `unchanged vs 24h ago`
                : `${formatDelta(delta)} ${deltaPct !== undefined && deltaPct !== null ? `(${formatDeltaPct(deltaPct)}) ` : ''}${directionLabel} vs 24h ago`
            }
          >
            {DeltaIcon && <DeltaIcon size={10} weight="fill" color={deltaColor} aria-hidden />}
            <span>{formatDelta(delta)}</span>
            {deltaPct !== undefined && deltaPct !== null && (
              <span style={{ color: TOKENS.textFaint }}>({formatDeltaPct(deltaPct)})</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
