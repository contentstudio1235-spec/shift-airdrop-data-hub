"use client";

import React from 'react';
import { Rocket, Warning } from '@phosphor-icons/react';
import { TOKENS } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import { Card } from '../primitives/Card';
import { useLaunchThisWeek } from '@/hooks/useLaunchThisWeek';
import type { LaunchThisWeekChannel } from '@/types/pulse';

/**
 * LaunchThisWeekCard (HARVEST-001 / MR !30)
 *
 * Per-channel marketing performance card for the Pulse tab. Renders a
 * horizontal strip of channel mini-cards, ranked left-to-right by CAC
 * ascending. Each card surfaces: channel name, CAC value, stitch %,
 * median hours-to-first-trade, and a per-channel attribution coverage
 * badge. Below the strip: a "gathering signal" sub-list for sub-threshold
 * channels and a footer chip surfacing the overall unattributed share.
 *
 * Synthesis sources (in priority order; see
 * docs/superpowers/plans/2026-06-08-mr-30-launch-this-week-card.md):
 *   - Analytics Reporter: KPI definitions + confidence gates
 *   - UX Researcher:      horizontal strip + drill-down URL + accessibility
 *   - Product Manager:    coverage badge + muted CAC at <50% coverage
 *   - Workflow Architect: empty-state copy + spend-missing nudge
 *
 * Window is hardcoded to 7d (matches the card name) — the F1 fwindow URL
 * param is intentionally NOT respected here per all 3 design agents.
 *
 * URL contract (drill-down):
 *   - Default channel row: ?view=attribution&source={channel}&fwindow=7d
 *   - KOL channel row (medium=kol): adds &referrer={code}&referrerType=snag
 */

const COVERAGE_LOW_THRESHOLD = 50; // % — below this CAC renders muted

export function LaunchThisWeekCard() {
  const { data, loading, error } = useLaunchThisWeek();

  // Don't render at all on first paint before the first response — the rest
  // of Pulse already has a skeleton overlay, this stays out of the way.
  if (loading && !data) return null;

  // Soft failure: stay quiet rather than fill the operator's first impression
  // with a red error block. Errors surface via the existing IncidentBanner.
  if (error && !data) return null;
  if (!data) return null;

  const { rankedChannels, gatheringSignal, coverageOverall, campaignsMissingSpend, activeCampaignCount } = data;

  // Truly-empty state — no campaigns at all this week. Card stays hidden
  // until the operator launches something to track.
  if (activeCampaignCount === 0) return null;

  // Day-1 state — campaigns exist but no channel has converted enough to
  // rank. Show all configured channels as "Gathering signal" rows.
  const allChannels = [...rankedChannels, ...gatheringSignal];

  return (
    <Card padding={18}>
      <div style={headerStyle}>
        <div style={titleGroupStyle}>
          <Rocket size={16} weight="fill" color={TOKENS.accent} />
          <span style={titleStyle}>Launch this week</span>
        </div>
        <span style={badgeStyle}>Last 7d</span>
      </div>

      {allChannels.length === 0 ? (
        <EmptyStrip />
      ) : (
        <>
          {/* Reviewer-caught: explicit role="list"/"listitem" on <a> strips
              native link semantics and aria-live on a poll-refreshed strip
              chatters every 60s. Letting the <a> tags carry their implicit
              link role is the cleanest AT story here. */}
          <div style={stripStyle}>
            {rankedChannels.map((c, i) => (
              <ChannelMiniCard key={`r-${c.source}`} channel={c} rank={i + 1} />
            ))}
            {gatheringSignal.map(c => (
              <ChannelMiniCard key={`g-${c.source}`} channel={c} rank={null} />
            ))}
          </div>

          {(campaignsMissingSpend > 0 || coverageOverall < 60) && (
            <div style={footerStyle}>
              {campaignsMissingSpend > 0 && (
                <a
                  href="/admin/data-hub?view=raw"
                  style={footerLinkStyle}
                >
                  {campaignsMissingSpend} of {activeCampaignCount} campaign{activeCampaignCount === 1 ? '' : 's'} missing spend
                </a>
              )}
              {coverageOverall < 60 && (
                <a
                  href="/admin/data-hub?view=attribution"
                  style={{ ...footerLinkStyle, color: TOKENS.threshold.yellow }}
                >
                  <Warning size={12} weight="fill" color={TOKENS.threshold.yellow} aria-hidden="true" />
                  {' '}{(100 - coverageOverall).toFixed(0)}% of new signups unattributed
                </a>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── ChannelMiniCard ────────────────────────────────────────────────────────

interface ChannelMiniCardProps {
  channel: LaunchThisWeekChannel;
  /** 1-indexed rank within rankedChannels, or null for gatheringSignal rows. */
  rank: number | null;
}

function ChannelMiniCard({ channel, rank }: ChannelMiniCardProps) {
  const isGathering = rank === null;
  const coverageLow = channel.coveragePct < COVERAGE_LOW_THRESHOLD;
  const href = buildDrillDownHref(channel);
  const ariaLabel = rank !== null
    ? `Rank ${rank}: ${channel.source}${channel.cac !== null ? `, CAC ${fmtUSD(channel.cac)}` : ''}`
    : `${channel.source} — gathering signal, ${channel.gateReason ?? 'below threshold'}`;

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      style={{
        ...miniCardStyle,
        opacity: isGathering ? 0.55 : 1,
        cursor: 'pointer',
      }}
    >
      <div style={miniCardHeaderStyle}>
        <span style={channelNameStyle}>{channel.source}</span>
        {channel.medium && <span style={mediumPillStyle}>{channel.medium}</span>}
      </div>
      <div style={primaryMetricStyle}>
        {channel.cac !== null ? (
          <span
            style={{
              ...cacValueStyle,
              opacity: coverageLow ? 0.5 : 1,
            }}
            title={coverageLow ? `CAC may be understated — only ${channel.coveragePct.toFixed(0)}% attributed` : undefined}
          >
            {fmtUSD(channel.cac)}
            <span style={cacUnitStyle}> / holder</span>
          </span>
        ) : channel.spendUSD === null && channel.campaignCount > 0 ? (
          <a href="/admin/data-hub?view=raw" style={addSpendLinkStyle} onClick={(e) => e.stopPropagation()}>
            Add spend →
          </a>
        ) : (
          <span style={dashStyle}>—</span>
        )}
      </div>
      <div style={secondaryRowStyle}>
        <Stat label="Signups" value={channel.signups.toLocaleString()} />
        <Stat label="Holders" value={channel.holders.toLocaleString()} />
        <Stat
          label="HTFT"
          value={channel.htftMedianHours !== null ? `${channel.htftMedianHours.toFixed(1)}h` : '—'}
        />
      </div>
      <div style={coverageBadgeStyle(channel.coveragePct)}>
        {channel.coveragePct.toFixed(0)}% attributed
      </div>
      {isGathering && channel.gateReason && (
        <div style={gateReasonStyle}>
          Gathering signal · {channel.gateReason}
        </div>
      )}
    </a>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDrillDownHref(c: LaunchThisWeekChannel): string {
  // V1: deep-link to Attribution view without source filter — AttributionView
  // doesn't read URL source/referrer params yet (Reviewer-caught). V2 will
  // either add source filtering to AttributionView OR route KOL channels to
  // ?view=users&referrer={snag_code}&referrerType=snag once we surface the
  // canonical Snag code (not the utm_source string). Keeping the contract
  // minimal here prevents shipping a link that lies about what it'll filter.
  return `/admin/data-hub?view=attribution&source=${encodeURIComponent(c.source)}&fwindow=7d`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statStyle}>
      <span style={statLabelStyle}>{label}</span>
      <span style={statValueStyle}>{value}</span>
    </div>
  );
}

function EmptyStrip() {
  return (
    <div style={{
      padding: '20px 4px',
      fontSize: 12,
      color: TOKENS.textFaint,
      textAlign: 'center',
    }}>
      No active campaigns this week.{' '}
      <a href="/admin/data-hub?view=raw" style={{ color: TOKENS.accent, textDecoration: 'underline' }}>
        Launch one via Engineering → UTM →
      </a>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
};

const titleGroupStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.3,
  color: TOKENS.textPrimary,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.6,
  padding: '3px 8px',
  background: 'rgba(0,200,150,0.12)',
  border: '1px solid rgba(0,200,150,0.25)',
  borderRadius: 4,
  color: TOKENS.accent,
};

const stripStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  overflowX: 'auto',
  paddingBottom: 4,
};

const miniCardStyle: React.CSSProperties = {
  flex: '1 0 200px',
  minWidth: 200,
  maxWidth: 280,
  padding: 12,
  background: 'rgba(8,18,14,0.5)',
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  textDecoration: 'none',
  color: 'inherit',
  transition: 'border-color 120ms ease',
};

const miniCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 6,
};

const channelNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: TOKENS.textPrimary,
  textTransform: 'capitalize',
};

const mediumPillStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  padding: '2px 5px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 3,
  color: TOKENS.textFaint,
  letterSpacing: 0.4,
};

const primaryMetricStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  minHeight: 24,
};

const cacValueStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: TOKENS.accent,
};

const cacUnitStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  color: TOKENS.textFaint,
  marginLeft: 4,
};

const addSpendLinkStyle: React.CSSProperties = {
  fontSize: 12,
  color: TOKENS.accent,
  textDecoration: 'underline',
  fontWeight: 500,
};

const dashStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: TOKENS.textFaint,
};

const secondaryRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
};

const statStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: 0.4,
  color: TOKENS.textFaint,
  textTransform: 'uppercase',
};

const statValueStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: TOKENS.textPrimary,
};

function coverageBadgeStyle(pct: number): React.CSSProperties {
  const color = pct >= 80
    ? TOKENS.accent
    : pct >= COVERAGE_LOW_THRESHOLD
      ? TOKENS.threshold.yellow
      : TOKENS.threshold.red;
  return {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 0.4,
    color,
    textTransform: 'uppercase',
    marginTop: 2,
  };
}

const gateReasonStyle: React.CSSProperties = {
  fontSize: 10,
  fontStyle: 'italic',
  color: TOKENS.textFaint,
  marginTop: 2,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid rgba(255,255,255,0.05)',
  flexWrap: 'wrap',
};

const footerLinkStyle: React.CSSProperties = {
  fontSize: 11,
  color: TOKENS.textFaint,
  textDecoration: 'underline',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
