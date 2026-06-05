"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Info, Warning, WarningOctagon, ArrowRight, X as XIcon } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';

export type AnomalySeverity = 'info' | 'warn' | 'critical';

/**
 * AnomalyCallout — horizontal card that surfaces a notable change or anomaly.
 *
 * Used by Pulse (Phase 2) and the Funnels biggest-leak indicator to direct
 * the operator to the diagnostic view.
 *
 * **Action precedence:** if both `actionHref` and `onAction` are provided,
 * `actionHref` wins and a dev-only `console.error` warns. Pick one in the
 * caller; the runtime degrades gracefully rather than crashing the subtree.
 *
 * Visual / a11y contract:
 * - Background: TOKENS.panel with blur(12px)
 * - Border: 1px solid severity color at 20% opacity
 * - Icon wrapper carries `aria-label="info"|"warn"|"critical"` for the test contract
 * - Wrapper is `aria-live="polite"` so screen readers announce on render
 * - NO entrance animation, NO idle motion
 */
export interface AnomalyCalloutProps {
  severity: AnomalySeverity;
  /** One-sentence plain-text message. No markdown. */
  message: string;
  /** CTA label text, e.g. "Investigate". Required for the CTA to render. */
  actionLabel?: string;
  /** Navigates via Next.js Link on click. Mutually exclusive with `onAction`. */
  actionHref?: string;
  /** Programmatic click handler. Mutually exclusive with `actionHref`. */
  onAction?: () => void;
  /** Shows an X button that hides the callout from the React tree (transient). */
  dismissible?: boolean;
}

const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  info: TOKENS.accent,
  warn: TOKENS.threshold.yellow,
  critical: TOKENS.threshold.red,
};

const SEVERITY_ICONS: Record<AnomalySeverity, React.ComponentType<{ size?: number; weight?: 'fill'; color?: string }>> = {
  info: Info,
  warn: Warning,
  critical: WarningOctagon,
};

/**
 * Convert an 8-char accent color (no alpha) into a border color at 20% opacity.
 * Inputs are known hex strings from TOKENS, so the parse is safe.
 */
function withAlpha20(hex: string): string {
  // Expect #rrggbb
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.2)`;
}

export function AnomalyCallout({
  severity,
  message,
  actionLabel,
  actionHref,
  onAction,
  dismissible = false,
}: AnomalyCalloutProps) {
  // Precedence rule when callers pass both: actionHref wins (Next router nav).
  // Crash-free degradation; bad prop combos shouldn't take down the subtree.
  if (process.env.NODE_ENV !== 'production' && actionHref && onAction) {
    // eslint-disable-next-line no-console
    console.error(
      'AnomalyCallout: pass either actionHref OR onAction, not both. actionHref takes precedence.',
    );
  }
  const [visible, setVisible] = useState(true);
  const [ctaHover, setCtaHover] = useState(false);

  if (!visible) return null;

  const color = SEVERITY_COLORS[severity];
  const IconComponent = SEVERITY_ICONS[severity];
  const hasCta = !!(actionLabel && (actionHref || onAction));

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: TOKENS.panel,
    border: `1px solid ${withAlpha20(color)}`,
    borderRadius: 8,
    backdropFilter: `blur(${TOKENS.glassBlur})`,
    WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
  };

  const iconWrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const messageStyle: React.CSSProperties = {
    fontSize: 12,
    color: TOKENS.textPrimary,
    lineHeight: 1.4,
    flex: 1,
  };

  const ctaContainerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    color,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: ctaHover ? 'underline' : 'none',
    fontFamily: 'inherit',
    flexShrink: 0,
  };

  const ctaInner = (
    <>
      <ArrowRight size={14} weight="fill" color={color} aria-hidden="true" />
      <span>{actionLabel}</span>
    </>
  );

  const dismissButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    color: TOKENS.textFaint,
    cursor: 'pointer',
    flexShrink: 0,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={wrapperStyle}
    >
      <span aria-label={severity} style={iconWrapperStyle}>
        <IconComponent size={14} weight="fill" color={color} />
      </span>
      <span style={messageStyle}>{message}</span>
      {hasCta && actionHref && (
        <Link
          href={actionHref}
          style={ctaContainerStyle}
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          onFocus={() => setCtaHover(true)}
          onBlur={() => setCtaHover(false)}
        >
          {ctaInner}
        </Link>
      )}
      {hasCta && !actionHref && onAction && (
        <button
          type="button"
          onClick={onAction}
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          onFocus={() => setCtaHover(true)}
          onBlur={() => setCtaHover(false)}
          style={ctaContainerStyle}
        >
          {ctaInner}
        </button>
      )}
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setVisible(false)}
          style={dismissButtonStyle}
        >
          <XIcon size={14} weight="fill" color={TOKENS.textFaint} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
