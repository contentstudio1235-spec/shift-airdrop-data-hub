"use client";
import React, { useMemo, useState } from 'react';
import {
  Plus,
  Warning,
  Tag,
  CheckCircle,
  Archive,
} from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { TabHeader } from '../shared/TabHeader';
import { useUtmViolations, type UtmViolation } from '@/hooks/useUtmViolations';
import { useCampaigns, type Campaign } from '@/hooks/useCampaigns';
import { useApprovedUtmValues } from '@/hooks/useApprovedUtmValues';
import { CampaignBuilderDialog } from './CampaignBuilderDialog';

// ──────────────────────────────────────────────────────────────────────────────
// UtmGovernancePanel — Engineering sub-tab for UTM tracking discipline.
//
// Layout:
//   [TabHeader]
//   [3 KPI cards: Violations(7d), Active Campaigns, Approved Values]
//   [Two-column: Campaigns table (left, 55%) · Violations log (right, 45%)]
//
// Visual constraints are inherited from the rest of the Hub:
//   - Glassmorphism panels (TOKENS.panel + backdrop blur)
//   - Single accent #00c896
//   - Phosphor icons only, no emoji
//   - Tabular-nums for counts
//   - Threshold colors for violation count
// ──────────────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: TOKENS.panel,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  WebkitBackdropFilter: `blur(${TOKENS.glassBlur})`,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 16,
  padding: 20,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 380,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: TOKENS.textFaint,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: TOKENS.textMuted,
  marginTop: 4,
};

function violationThresholdColor(count: number): string {
  if (count === 0) return TOKENS.threshold.green;
  if (count > 10) return TOKENS.threshold.red;
  return TOKENS.threshold.yellow;
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function UtmGovernancePanel() {
  const violationsHook = useUtmViolations();
  const campaignsHook = useCampaigns({ active: true });
  const approved = useApprovedUtmValues();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const violations = violationsHook.data?.violations ?? [];
  const campaigns = campaignsHook.data?.campaigns ?? [];

  const filteredCampaigns = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(c =>
      c.displayName.toLowerCase().includes(q) ||
      c.utmSource.toLowerCase().includes(q) ||
      c.utmMedium.toLowerCase().includes(q) ||
      c.utmCampaign.toLowerCase().includes(q),
    );
  }, [campaigns, filter]);

  const violationsCount = violations.length;
  const activeCampaignsCount = campaigns.filter(c => !c.isArchived).length;
  const approvedTotal = approved.sources.length + approved.mediums.length;

  const anyLoading = violationsHook.loading || campaignsHook.loading || approved.loading;
  const lastUpdated = violationsHook.data ? new Date() : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader
        title="UTM Governance"
        subtitle="Track and validate every campaign URL. New violations flag attribution gaps."
        lastUpdated={lastUpdated}
        onRefresh={() => {
          violationsHook.refetch();
          campaignsHook.refetch();
          approved.refetch();
        }}
        loading={anyLoading}
      />

      {/* KPI row */}
      <div
        data-testid="utm-kpi-row"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
      >
        <KpiCard
          icon={<Warning size={12} weight="bold" />}
          label="Violations · 7d"
          value={violationsCount.toLocaleString()}
          subtitle={
            violationsHook.error
              ? `error: ${violationsHook.error}`
              : violationsCount === 0
                ? 'No rejected UTMs — tracking discipline holding'
                : `${violationsCount} URL${violationsCount === 1 ? '' : 's'} failed validation`
          }
          valueColor={violationThresholdColor(violationsCount)}
        />
        <KpiCard
          icon={<Tag size={12} weight="bold" />}
          label="Active Campaigns"
          value={activeCampaignsCount.toLocaleString()}
          subtitle={
            campaignsHook.error
              ? `error: ${campaignsHook.error}`
              : activeCampaignsCount === 0
                ? 'No campaigns yet — create one to begin'
                : `${campaigns.length.toLocaleString()} total in log`
          }
        />
        <KpiCard
          icon={<CheckCircle size={12} weight="bold" />}
          label="Approved Values"
          value={approved.loading ? '—' : `${approved.sources.length} src · ${approved.mediums.length} med`}
          subtitle={
            approved.error
              ? `error: ${approved.error}`
              : `${approvedTotal} locked values across both lists`
          }
        />
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 55fr) minmax(0, 45fr)',
          gap: 16,
        }}
      >
        <CampaignsCard
          campaigns={filteredCampaigns}
          totalCount={campaigns.length}
          loading={campaignsHook.loading}
          error={campaignsHook.error}
          filter={filter}
          onFilterChange={setFilter}
          onAdd={() => setDialogOpen(true)}
        />
        <ViolationsCard
          violations={violations}
          loading={violationsHook.loading}
          error={violationsHook.error}
        />
      </div>

      {dialogOpen && (
        <CampaignBuilderDialog
          sources={approved.sources}
          mediums={approved.mediums}
          approvedLoading={approved.loading}
          onClose={() => setDialogOpen(false)}
          onSuccess={() => {
            setDialogOpen(false);
            campaignsHook.refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  valueColor?: string;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 120,
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
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          fontWeight: 700,
          color: TOKENS.textFaint,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        <span aria-hidden style={{ display: 'inline-flex' }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: valueColor ?? TOKENS.textPrimary,
            lineHeight: 1.0,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: TOKENS.textMuted,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

// ─── Campaigns Card ───────────────────────────────────────────────────────────

function CampaignsCard({
  campaigns,
  totalCount,
  loading,
  error,
  filter,
  onFilterChange,
  onAdd,
}: {
  campaigns: Campaign[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  filter: string;
  onFilterChange: (next: string) => void;
  onAdd: () => void;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={cardTitleStyle}>
            <Tag size={12} weight="bold" />
            Campaigns
          </div>
          <div style={cardSubtitleStyle}>
            {totalCount.toLocaleString()} logged · every tagged URL Tomer ships
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          data-testid="add-campaign-btn"
          style={{
            background: TOKENS.accentDim,
            color: TOKENS.accent,
            border: `1px solid ${TOKENS.accentBorder}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'inherit',
            transition: `all ${MOTION.fast}`,
          }}
        >
          <Plus size={11} weight="bold" />
          Add Campaign
        </button>
      </div>

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <input
          type="text"
          value={filter}
          onChange={e => onFilterChange(e.target.value)}
          placeholder="Filter by name, source, medium, or campaign…"
          aria-label="Filter campaigns"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${TOKENS.accentBorder}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: TOKENS.textPrimary,
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      {error ? (
        <InlineMessage tone="error" text={`Failed to load campaigns: ${error}`} />
      ) : loading && campaigns.length === 0 ? (
        <InlineMessage tone="muted" text="Loading campaigns…" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns logged yet"
          body="Click Add Campaign to mint the first tagged URL. Every campaign you launch flows through this log."
        />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: TOKENS.textFaint }}>
                <Th>Source</Th>
                <Th>Medium</Th>
                <Th>Campaign</Th>
                <Th align="right">Created</Th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <CampaignRow key={c.id} campaign={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '6px 8px',
        borderBottom: `1px solid ${TOKENS.accentBorder}`,
      }}
    >
      {children}
    </th>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? TOKENS.tableRowHover : 'transparent',
        transition: `background ${MOTION.fast}`,
      }}
    >
      <Td>
        <span style={{ color: TOKENS.textPrimary }}>{campaign.utmSource}</span>
      </Td>
      <Td>
        <span style={{ color: TOKENS.textSecondary }}>{campaign.utmMedium}</span>
      </Td>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              color: TOKENS.textPrimary,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 220,
            }}
            title={campaign.displayName}
          >
            {campaign.utmCampaign}
          </span>
          {campaign.isArchived && (
            <Archive size={10} weight="bold" color={TOKENS.textFaint} aria-label="Archived" />
          )}
        </div>
      </Td>
      <Td align="right">
        <span style={{ color: TOKENS.textFaint, fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(campaign.createdAt)}
        </span>
      </Td>
    </tr>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td
      style={{
        textAlign: align,
        padding: '8px',
        borderBottom: `1px solid ${TOKENS.chartGrid}`,
        verticalAlign: 'middle',
      }}
    >
      {children}
    </td>
  );
}

// ─── Violations Card ──────────────────────────────────────────────────────────

function ViolationsCard({
  violations,
  loading,
  error,
}: {
  violations: UtmViolation[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={cardTitleStyle}>
            <Warning size={12} weight="bold" />
            Recent Violations · 7d
          </div>
          <div style={cardSubtitleStyle}>Rejected UTM values — auto-refreshes every 60s</div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            color: TOKENS.textFaint,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: TOKENS.accent,
              boxShadow: `0 0 6px ${TOKENS.accent}`,
            }}
          />
          auto-refresh
        </span>
      </div>

      <div style={{ marginTop: 16, flex: 1, overflowY: 'auto' }}>
        {error ? (
          <InlineMessage tone="error" text={`Failed to load violations: ${error}`} />
        ) : loading && violations.length === 0 ? (
          <InlineMessage tone="muted" text="Loading violations…" />
        ) : violations.length === 0 ? (
          <EmptyState
            title="No violations in the last 7 days"
            body="Either tracking discipline is holding, or no traffic has hit validated endpoints yet."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {violations.map(v => (
              <ViolationRow key={v.id} violation={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ViolationRow({ violation }: { violation: UtmViolation }) {
  return (
    <div
      style={{
        padding: 10,
        border: `1px solid ${TOKENS.accentBorder}`,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
        }}
      >
        <span
          style={{
            color: TOKENS.textPrimary,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {violation.rejectedField}={violation.rejectedValue}
        </span>
        <span style={{ color: TOKENS.textFaint, fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
          {timeAgo(violation.occurredAt)}
        </span>
      </div>
      <div style={{ fontSize: 10, color: TOKENS.threshold.yellow, letterSpacing: '0.04em' }}>
        reason: {violation.reason}
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      data-testid="utm-empty-state"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
        textAlign: 'center',
        gap: 6,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: TOKENS.textPrimary, opacity: 0.85 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: TOKENS.textMuted, maxWidth: 320, lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  );
}

function InlineMessage({ tone, text }: { tone: 'muted' | 'error'; text: string }) {
  const color = tone === 'error' ? TOKENS.threshold.red : TOKENS.textMuted;
  return (
    <div style={{ padding: 16, fontSize: 12, color, textAlign: 'center' }}>{text}</div>
  );
}
