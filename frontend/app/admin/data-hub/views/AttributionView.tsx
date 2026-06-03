"use client";
import React from 'react';
import {
  ChartBar,
  Megaphone,
  Gauge,
  ArrowClockwise,
  Warning,
  CircleNotch,
} from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import {
  useAttributionOverview,
  type ChannelROIRow,
  type TopCampaignRow,
  type AttributionCoverage,
} from '@/hooks/useAttributionOverview';

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

export function AttributionView() {
  const { data, loading, error, refetch } = useAttributionOverview();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Header data={data} loading={loading} onRefresh={refetch} />

      {error ? (
        <ErrorPanel message={error} onRetry={refetch} />
      ) : loading && !data ? (
        <LoadingPanel />
      ) : !data ? null : (
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
      )}
    </div>
  );
}

// ─── Header strip ─────────────────────────────────────────────────────────────

function Header({
  data,
  loading,
  onRefresh,
}: {
  data: { computedAt: string; dataQuality: string; note?: string } | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div
      style={{
        background: TOKENS.panel,
        backdropFilter: `blur(${TOKENS.glassBlur})`,
        border: `1px solid ${TOKENS.accentBorder}`,
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: TOKENS.textPrimary, letterSpacing: '-0.02em' }}>
          Source Attribution
        </div>
        <div style={{ fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}>
          {data?.note ?? 'UTM-first attribution. Stitching activated Sprint 2.3.'}
        </div>
      </div>
      {data && (
        <div style={{ fontSize: 11, color: TOKENS.textFaint, fontVariantNumeric: 'tabular-nums' }}>
          updated {new Date(data.computedAt).toLocaleTimeString()}
        </div>
      )}
      <button
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh"
        style={{
          background: 'transparent',
          border: `1px solid ${TOKENS.accentBorder}`,
          borderRadius: 8,
          color: TOKENS.accent,
          padding: '6px 10px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          transition: `all ${MOTION.fast}`,
        }}
      >
        <ArrowClockwise size={12} weight="bold" />
        Refresh
      </button>
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
                    width: 84,
                    fontSize: 11,
                    fontWeight: 700,
                    color: TOKENS.textSecondary,
                    textTransform: 'lowercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.source}
                >
                  {r.source}
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
