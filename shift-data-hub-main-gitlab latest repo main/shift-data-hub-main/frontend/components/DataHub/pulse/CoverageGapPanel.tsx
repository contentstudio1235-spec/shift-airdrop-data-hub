"use client";

import React from 'react';
import { Warning, CheckCircle, ArrowSquareOut } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { useUtmViolations, type UtmViolation } from '@/hooks/useUtmViolations';

/**
 * CoverageGapPanel (HARVEST-002 / MR !34, score 54)
 *
 * Expands inline under the LaunchThisWeekCard footer chip ("X% unattributed").
 * Groups the last 7 days of utm_violations by `reason` and surfaces the top
 * 5 buckets as a diagnostic list — read-only V1.
 *
 * Synthesis sources:
 *   - Analytics Reporter: "recovery-first" framing (rank by lift potential
 *     not raw violation count) — adapted client-side: rank by count as
 *     a proxy for traffic impact since the violations payload doesn't yet
 *     carry per-URL traffic volume.
 *   - UX Researcher: scrollable expansion under the chip, single Fix→
 *     CTA per row deep-linking to Engineering UTM admin.
 *   - Product Manager: STRUCTURAL-REALITY CAVEAT IS LOAD-BEARING — the
 *     panel must name that violations log shows known-broken tags only,
 *     not the much larger pool of untagged-from-the-start traffic. Without
 *     this sentence V1 ships false comfort and erodes the trust floor
 *     HARVEST-001 just built.
 *
 * V1 explicit non-features (per PM scope decision):
 *   - No severity scoring (raw count only — operator triages mentally)
 *   - No Campaign Builder pre-fill (V2 once a write path is designed)
 *   - No new backend endpoint (groups existing /api/utm/violations client-side)
 *   - No bulk operations
 *   - No coverage trajectory sparkline
 */

const TOP_N_BUCKETS = 5;
const ENGINEERING_UTM_HREF = '/admin/data-hub?view=raw';

interface ViolationBucket {
  reason: string;
  count: number;
  recentExampleUrl: string;
  recentRejectedField: string;
  recentRejectedValue: string;
}

function groupViolations(violations: UtmViolation[]): ViolationBucket[] {
  const buckets = new Map<string, ViolationBucket>();
  for (const v of violations) {
    const existing = buckets.get(v.reason);
    if (existing) {
      existing.count += 1;
      // Keep the most recent example (violations are returned DESC by
      // occurredAt — first one we see for each reason IS the most recent).
    } else {
      buckets.set(v.reason, {
        reason: v.reason,
        count: 1,
        recentExampleUrl: v.rawUrl,
        recentRejectedField: v.rejectedField,
        recentRejectedValue: v.rejectedValue,
      });
    }
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N_BUCKETS);
}

export function CoverageGapPanel() {
  const { data, loading, error } = useUtmViolations({ limit: 200 });

  if (loading && !data) {
    return (
      <div style={containerStyle}>
        <div style={{ ...captionStyle, opacity: 0.5 }}>Loading violations…</div>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div style={containerStyle}>
        <div style={captionStyle}>Failed to load coverage gap diagnostics.</div>
      </div>
    );
  }
  if (!data) return null;

  const violations = data.violations ?? [];
  const buckets = groupViolations(violations);
  const totalViolations = violations.length;

  return (
    <div style={containerStyle}>
      {/* PM-required trust-floor guardrail — the structural-vs-enumerable
          caveat. Removing this sentence ships false comfort. Non-negotiable. */}
      <div style={captionStyle}>
        <Warning size={11} weight="fill" color={TOKENS.threshold.yellow} aria-hidden="true" />
        <span>
          Most untagged traffic never appears here — there&apos;s no link to violate against.
          This shows known-broken tags from the last 7 days only.
        </span>
      </div>

      {buckets.length === 0 ? (
        <div style={healthyStripStyle}>
          <CheckCircle size={12} weight="fill" color={TOKENS.accent} aria-hidden="true" />
          <span style={{ color: TOKENS.accent, fontWeight: 600 }}>No new UTM violations in 7d.</span>
          <span style={{ color: TOKENS.textFaint }}>
            Coverage improvement work this week shifts to untagged-from-the-start sources
            (not visible in this panel) — see UTM Builder.
          </span>
          <a href={ENGINEERING_UTM_HREF} style={ctaLinkStyle}>
            Open UTM Builder <ArrowSquareOut size={10} weight="fill" color={TOKENS.accent} />
          </a>
        </div>
      ) : (
        <>
          <div style={listHeaderStyle}>
            <span>Top {Math.min(buckets.length, TOP_N_BUCKETS)} broken-tag patterns
              {totalViolations > TOP_N_BUCKETS ? ` (of ${totalViolations} total)` : ''}
            </span>
          </div>
          <div role="list" style={listStyle}>
            {buckets.map((b) => (
              <div key={b.reason} role="listitem" style={rowStyle}>
                <div style={rowHeaderStyle}>
                  <span style={reasonStyle}>{b.reason}</span>
                  <span style={countPillStyle}>{b.count.toLocaleString()}×</span>
                </div>
                <div style={exampleStyle} title={b.recentExampleUrl}>
                  <code style={codeStyle}>
                    {b.recentRejectedField}={b.recentRejectedValue || '(empty)'}
                  </code>
                </div>
                <a href={ENGINEERING_UTM_HREF} style={fixLinkStyle}>
                  Fix in UTM Builder <ArrowSquareOut size={10} weight="fill" color={TOKENS.accent} />
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginTop: 10,
  padding: 12,
  background: 'rgba(8,18,14,0.4)',
  border: '1px solid rgba(255,193,7,0.15)',
  borderRadius: 6,
};

const captionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  fontSize: 11,
  lineHeight: 1.4,
  color: TOKENS.textFaint,
  fontStyle: 'italic',
};

const healthyStripStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
  fontSize: 11,
};

const listHeaderStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: TOKENS.textFaint,
  textTransform: 'uppercase',
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '8px 10px',
  background: 'rgba(8,18,14,0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 4,
};

const rowHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const reasonStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: TOKENS.textPrimary,
};

const countPillStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: '2px 6px',
  background: 'rgba(255,193,7,0.12)',
  border: '1px solid rgba(255,193,7,0.25)',
  borderRadius: 3,
  color: TOKENS.threshold.yellow,
  fontVariantNumeric: 'tabular-nums',
};

const exampleStyle: React.CSSProperties = {
  fontSize: 10,
  color: TOKENS.textFaint,
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  background: 'rgba(255,255,255,0.04)',
  padding: '1px 4px',
  borderRadius: 2,
};

const fixLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 11,
  color: TOKENS.accent,
  textDecoration: 'underline',
  fontWeight: 600,
  alignSelf: 'flex-start',
};

const ctaLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 11,
  color: TOKENS.accent,
  textDecoration: 'underline',
  fontWeight: 600,
};
