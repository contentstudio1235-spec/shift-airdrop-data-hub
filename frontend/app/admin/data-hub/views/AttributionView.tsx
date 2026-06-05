"use client";
import React from 'react';
import {
  ChartBar,
  Megaphone,
  Gauge,
  Warning,
  CircleNotch,
  TrendUp,
  Medal,
  LinkSimple,
} from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { fmtUSD, fmtWallet } from '@/lib/format';
import {
  useAttributionOverview,
  type ChannelROIRow,
  type TopCampaignRow,
  type AttributionCoverage,
  type AttributionOverview,
} from '@/hooks/useAttributionOverview';
import { useWhaleOrigins } from '@/hooks/useWhaleOrigins';
import {
  useKOLLeaderboard,
  type KOLEntry,
  type KOLPayload,
} from '@/hooks/useKOLLeaderboard';
import { useWhaleStream } from '@/hooks/useWhaleStream';
import { WhaleSankey } from '@/components/DataHub/attribution/WhaleSankey';
import { KOLLeaderboard } from '@/components/DataHub/attribution/KOLLeaderboard';
import { WhaleWatch } from '@/components/DataHub/attribution/WhaleWatch';
import { TabHeader } from '@/components/DataHub/shared/TabHeader';

const cardStyle: React.CSSProperties = {
  background: TOKENS.panel,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 16,
  padding: 24,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 280,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: TOKENS.textFaint,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginBottom: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: TOKENS.textMuted,
  marginBottom: 16,
};

// Display-only labels for synthetic source values returned by the backend.
const SOURCE_LABEL: Record<string, string> = {
  snag_referrals: 'Snag Referrals',
  direct: 'Direct',
};

function formatSource(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

export function AttributionView() {
  const { data, loading, error, refetch } = useAttributionOverview();
  const whaleOrigins = useWhaleOrigins();
  const kol = useKOLLeaderboard({ limit: 50 });
  const whaleStream = useWhaleStream({ bufferSize: 30 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader
        title="Source Attribution"
        subtitle={data?.note ?? 'UTM-first attribution. Stitching activated Sprint 2.3.'}
        lastUpdated={data ? new Date(data.computedAt) : null}
        onRefresh={refetch}
        loading={loading}
      />

      {error ? (
        <ErrorPanel message={error} onRetry={refetch} />
      ) : loading && !data ? (
        <LoadingPanel />
      ) : !data ? null : (
        <>
          {/* Phase 3.3: Level-1 KPI cards above Whale Sankey */}
          <SourceKPIRow overview={data} kol={kol.data} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)',
              gap: 16,
            }}
          >
            <ChannelsCard rows={data.channels} />
            <CampaignsCard rows={data.campaigns} />
            <CoverageCard coverage={data.coverage} computedAt={data.computedAt} />
          </div>
        </>
      )}

      {/* Sprint 3 Row 2: Sankey */}
      <WhaleSankey
        data={whaleOrigins.data}
        loading={whaleOrigins.loading}
        error={whaleOrigins.error}
      />

      {/* Sprint 3 Row 3: KOL + WhaleWatch */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        <KOLLeaderboard
          data={kol.data}
          loading={kol.loading}
          error={kol.error}
        />
        <WhaleWatch
          events={whaleStream.events}
          connected={whaleStream.connected}
          error={whaleStream.error}
        />
      </div>
    </div>
  );
}

// ─── Header strip ─────────────────────────────────────────────────────────────

// ─── Phase 3.3: Source Level-1 KPI cards ──────────────────────────────────────
// Three "what's the answer?" cards rendered above the Whale Sankey:
//   1) Best ROI source — highest holder/user conversion rate from channels[]
//   2) Top KOL this week — best referrer in the leaderboard, filtered to the
//      last 7 days when lastSeenAt allows it (falls back to highest score)
//   3) Stitch coverage — overall % of profiles with any attribution signal
//
// Computed entirely client-side from existing hook payloads. No backend change.

interface BestSource {
  source: string;
  users: number;
  holders: number;
  holderRatePct: number;
}

/**
 * Find the channel with the highest holder/user ratio.
 * Tie-breaker: highest users count.
 * Returns null when no channel has any users.
 */
function pickBestROISource(channels: ChannelROIRow[]): BestSource | null {
  let best: BestSource | null = null;
  for (const row of channels) {
    if (row.users <= 0) continue;
    const ratio = row.holders / row.users;
    if (
      best === null ||
      ratio > best.holderRatePct / 100 ||
      (ratio === best.holderRatePct / 100 && row.users > best.users)
    ) {
      best = {
        source: row.source,
        users: row.users,
        holders: row.holders,
        holderRatePct: Math.round(ratio * 1000) / 10,
      };
    }
  }
  return best;
}

/**
 * Pick the top KOL — prefer entries seen in the last 7 days, then highest score.
 * Falls back to the highest-score entry overall when nothing is recent.
 */
function pickTopKOL(rows: KOLEntry[]): KOLEntry | null {
  if (rows.length === 0) return null;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = rows.filter(r => {
    const t = new Date(r.lastSeenAt).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  const pool = recent.length > 0 ? recent : rows;
  return pool.reduce((best, r) => (best === null || r.score > best.score ? r : best), null as KOLEntry | null);
}

/**
 * Truncate a referrer label — looks like a wallet (Base58 ≥ 32 chars, no
 * spaces) → middle-truncate; otherwise show as-is.
 */
function formatReferrer(referrer: string): string {
  if (!referrer) return '—';
  if (referrer.length >= 32 && /^[A-Za-z0-9]+$/.test(referrer)) {
    return fmtWallet(referrer);
  }
  return referrer;
}

function SourceKPIRow({
  overview,
  kol,
}: {
  overview: AttributionOverview;
  kol: KOLPayload | null;
}) {
  const best = pickBestROISource(overview.channels);
  const topKOL = kol ? pickTopKOL(kol.rows) : null;
  const coveragePct = overview.coverage.percentWithSignal;
  const stitchedCount =
    overview.coverage.withUtm + overview.coverage.withReferralOnly;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 16,
      }}
    >
      <SourceKPI
        icon={<TrendUp size={12} weight="bold" />}
        label="Best ROI Source · 30d"
        value={best ? formatSource(best.source) : '—'}
        subtitle={
          best
            ? `${best.holders.toLocaleString()} holders / ${best.users.toLocaleString()} users (${best.holderRatePct.toFixed(1)}% conv)`
            : 'No channel data yet'
        }
      />
      <SourceKPI
        icon={<Medal size={12} weight="bold" />}
        label="Top KOL · 7d"
        value={topKOL ? formatReferrer(topKOL.referrer) : '—'}
        subtitle={
          topKOL
            ? `${topKOL.users.toLocaleString()} users · ${
                topKOL.totalVolumeUSD > 0 ? fmtUSD(topKOL.totalVolumeUSD) : '$0'
              } volume`
            : 'No referrers yet'
        }
      />
      <SourceKPI
        icon={<LinkSimple size={12} weight="bold" />}
        label="Attribution Signal"
        value={`${coveragePct.toFixed(1)}%`}
        subtitle={`${stitchedCount.toLocaleString()} stitched / ${overview.coverage.total.toLocaleString()} total`}
        tooltip="% of profiles with any attribution signal (UTM tag or referral source)"
      />
    </div>
  );
}

/**
 * SourceKPI — local hero card variant for the Sources tab.
 * Differs from Pulse's KPICard because the value can be a string (a source
 * name, a wallet/referrer code, or a formatted percent) and the layout shows
 * an explanatory subtitle below the value rather than a Δ-vs-24h chip.
 *
 * `tooltip` is an optional native HTML `title` applied to the card root —
 * used to surface the precise formula behind a metric on hover (e.g. the
 * "Attribution Signal" card explains it counts UTM + referral profiles).
 */
function SourceKPI({
  icon,
  label,
  value,
  subtitle,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  tooltip?: string;
}) {
  const [hover, setHover] = React.useState(false);

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
    fontSize: 24,
    fontWeight: 800,
    color: TOKENS.textPrimary,
    lineHeight: 1.0,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: TOKENS.textMuted,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tooltip}
    >
      <div style={labelRowStyle}>
        <span aria-hidden style={{ display: 'inline-flex' }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={valueStyle} title={tooltip ? undefined : value}>{value}</div>
        <div style={subtitleStyle} title={tooltip ? undefined : subtitle}>{subtitle}</div>
      </div>
    </div>
  );
}

// ─── Channels card ────────────────────────────────────────────────────────────

function ChannelsCard({ rows }: { rows: ChannelROIRow[] }) {
  const maxUsers = rows.reduce((m, r) => Math.max(m, r.users), 1);
  return (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>
        <ChartBar size={12} weight="bold" />
        Channels
      </div>
      <div style={cardSubtitleStyle}>Profiles by first-touch source</div>
      {rows.length === 0 ? (
        <EmptyState message="No source data yet. UTM stitching activated — first profiles appear within ~1 hour." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          {rows.slice(0, 12).map(r => {
            const pct = maxUsers === 0 ? 0 : (r.users / maxUsers) * 100;
            return (
              <div key={r.source} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    color: TOKENS.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.source}
                >
                  {formatSource(r.source)}
                </div>
                <div style={{ flex: 1, height: 8, background: TOKENS.chartGrid, borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: TOKENS.accent,
                      transition: `width ${MOTION.slow}`,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 56,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: 800,
                    color: TOKENS.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {r.users.toLocaleString()}
                </div>
                <div
                  style={{
                    width: 64,
                    textAlign: 'right',
                    fontSize: 11,
                    color: TOKENS.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  title="Total volume USD"
                >
                  {r.totalVolumeUSD > 0 ? fmtUSD(r.totalVolumeUSD) : '—'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Campaigns card ───────────────────────────────────────────────────────────

function CampaignsCard({ rows }: { rows: TopCampaignRow[] }) {
  return (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>
        <Megaphone size={12} weight="bold" />
        Top Campaigns
      </div>
      <div style={cardSubtitleStyle}>By first_utm_campaign</div>
      {rows.length === 0 ? (
        <EmptyState message="No tagged campaigns yet. Tag links with ?utm_campaign=... to start tracking." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {rows.map(r => (
            <div
              key={`${r.campaign}|${r.source ?? ''}|${r.medium ?? ''}`}
              style={{
                padding: '8px 0',
                borderBottom: `1px solid ${TOKENS.chartGrid}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: TOKENS.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.campaign}
                >
                  {r.campaign}
                </div>
                <div style={{ fontSize: 10, color: TOKENS.textFaint, marginTop: 2 }}>
                  {r.source ?? '—'} · {r.medium ?? '—'}
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: TOKENS.accent,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {r.profiles.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Coverage card ────────────────────────────────────────────────────────────

function CoverageCard({ coverage, computedAt: _ }: { coverage: AttributionCoverage; computedAt: string }) {
  const ringSize = 140;
  const stroke = 12;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const utmOffset = circumference * (1 - coverage.percentWithUtm / 100);
  const totalSignal = coverage.percentWithSignal;

  return (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>
        <Gauge size={12} weight="bold" />
        Coverage
      </div>
      <div style={cardSubtitleStyle}>% of profiles with any attribution signal</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
        <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
          <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="transparent"
              stroke={TOKENS.chartGrid}
              strokeWidth={stroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="transparent"
              stroke={TOKENS.accent}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={utmOffset}
              strokeLinecap="round"
              style={{ transition: `stroke-dashoffset ${MOTION.slow}` }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: TOKENS.textPrimary,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {coverage.percentWithUtm.toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: TOKENS.textFaint, marginTop: 4, letterSpacing: '0.1em' }}>UTM</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CoverageRow label="With UTM" value={coverage.withUtm} percent={coverage.percentWithUtm} color={TOKENS.accent} />
          <CoverageRow
            label="Referral only"
            value={coverage.withReferralOnly}
            percent={Math.round((coverage.withReferralOnly / Math.max(1, coverage.total)) * 1000) / 10}
            color={TOKENS.threshold.yellow}
          />
          <CoverageRow
            label="No signal"
            value={coverage.neither}
            percent={Math.round((coverage.neither / Math.max(1, coverage.total)) * 1000) / 10}
            color={TOKENS.threshold.red}
          />
          <div style={{ height: 1, background: TOKENS.chartGrid, margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: TOKENS.textMuted }}>Total</span>
            <span style={{ color: TOKENS.textPrimary, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {coverage.total.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: TOKENS.textMuted }}>Any signal</span>
            <span style={{ color: TOKENS.accent, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {totalSignal.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverageRow({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: TOKENS.textMuted }}>{label}</span>
        <span style={{ color: TOKENS.textPrimary, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {value.toLocaleString()} · {percent.toFixed(1)}%
        </span>
      </div>
      <div style={{ height: 4, background: TOKENS.chartGrid, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, percent)}%`, height: '100%', background: color, transition: `width ${MOTION.slow}` }} />
      </div>
    </div>
  );
}

// ─── Empty / loading / error ──────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 10,
        color: TOKENS.textFaint,
        padding: '24px 12px',
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      <Gauge size={28} weight="regular" />
      <div style={{ maxWidth: 220 }}>{message}</div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div
      style={{
        ...cardStyle,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 12,
        color: TOKENS.textMuted,
      }}
    >
      <CircleNotch size={16} weight="bold" style={{ animation: 'attribution-spin 800ms linear infinite' }} />
      <style>{`@keyframes attribution-spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 12 }}>Loading attribution data…</span>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        ...cardStyle,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        border: `1px solid rgba(255,90,90,0.3)`,
      }}
    >
      <Warning size={24} weight="regular" color={TOKENS.threshold.red} />
      <div style={{ color: TOKENS.threshold.red, fontWeight: 700, fontSize: 12 }}>{message}</div>
      <button
        onClick={onRetry}
        style={{
          background: 'transparent',
          color: TOKENS.threshold.red,
          border: `1px solid ${TOKENS.threshold.red}`,
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.02em',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Retry
      </button>
    </div>
  );
}
