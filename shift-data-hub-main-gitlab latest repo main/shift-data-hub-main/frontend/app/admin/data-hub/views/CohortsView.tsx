"use client";
import React, { useMemo, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowsLeftRight,
  Warning,
  CircleNotch,
  Trophy,
  Skull,
  CaretDown,
  CaretUp,
  CaretRight,
  Users,
} from '@phosphor-icons/react';
import { TabHeader } from '@/components/DataHub/shared/TabHeader';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { fmtUSD } from '@/lib/format';
import { useCohortsSnapshot } from '@/hooks/useCohortsSnapshot';
import type { CohortEntry, CohortSummary, CohortsSnapshot } from '@/types/cohort';
import { FlagButton, FLAG_AFFORDANCE_HOST_CLASS } from '@/components/DataHub/primitives/FlagButton';
import { ReconciliationBadge } from '@/components/DataHub/primitives/ReconciliationBadge';
import { HUB_METRIC_IDS, HUB_TABS } from '@/lib/hubMetricIds';

// ────────────────────────────────────────────────────────────
// Thresholds — single source of truth for the view's color rules.
// ────────────────────────────────────────────────────────────

const ACTIVATION_GREEN = 35;
const ACTIVATION_YELLOW = 20;
const STITCH_GREEN = 30;
const STITCH_YELLOW = 15;

/**
 * Minimum cohort size before retention/activation percentages can be trusted.
 * Source: cohort-analysis skill recommends ≥100 users to avoid noisy rates that
 * read as visually precise but are statistically meaningless (e.g. a 20-user
 * cohort where one extra activation moves the rate by 5 pp). Cohorts below
 * this size are gated visually (row opacity) and excluded from the confident
 * trend label in the summary strip — their numbers still render, but are
 * marked as advisory rather than authoritative.
 */
const SMALL_COHORT_THRESHOLD = 100;

function activationColor(pct: number): string {
  if (pct >= ACTIVATION_GREEN) return TOKENS.threshold.green;
  if (pct >= ACTIVATION_YELLOW) return TOKENS.threshold.yellow;
  return TOKENS.threshold.red;
}

function stitchColor(pct: number): string {
  if (pct >= STITCH_GREEN) return TOKENS.threshold.green;
  if (pct >= STITCH_YELLOW) return TOKENS.threshold.yellow;
  return TOKENS.threshold.red;
}

// ────────────────────────────────────────────────────────────
// Shared styles
// ────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: TOKENS.panel,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 16,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: TOKENS.textFaint,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

// ────────────────────────────────────────────────────────────
// Sort state
// ────────────────────────────────────────────────────────────

type SortKey =
  | 'cohortKey'
  | 'size'
  | 'activationPct'
  | 'retentionWeek1'
  | 'retentionWeek4'
  | 'avgVolumePerUser'
  | 'whales'
  | 'stitchPct';

type SortDir = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  dir: SortDir;
}

function sortCohorts(rows: CohortEntry[], sort: SortState): CohortEntry[] {
  const out = [...rows];
  const mult = sort.dir === 'asc' ? 1 : -1;
  out.sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    // Null sorts to the END regardless of direction — operators want to see
    // real numbers on top, not a wall of em-dashes.
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb) * mult;
    }
    return ((va as number) - (vb as number)) * mult;
  });
  return out;
}

// ────────────────────────────────────────────────────────────
// Main view
// ────────────────────────────────────────────────────────────

export function CohortsView() {
  const { data, loading, error, refetch } = useCohortsSnapshot();
  const [sort, setSort] = useState<SortState>({ key: 'cohortKey', dir: 'desc' });
  const [showHeatmap, setShowHeatmap] = useState(false);

  const sortedCohorts = useMemo(() => {
    if (!data) return [] as CohortEntry[];
    return sortCohorts(data.cohorts, sort);
  }, [data, sort]);

  const handleSort = (key: SortKey) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'cohortKey' ? 'desc' : 'desc' },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader
        title="Trader Cohorts"
        subtitle="Are recent signup cohorts performing better, worse, or the same as older ones? Activation = first position opened. Retention = ≥1 position opened in target week."
        lastUpdated={data ? new Date(data.computedAt) : null}
        onRefresh={refetch}
        loading={loading}
      />

      {error ? (
        <ErrorPanel message={error} onRetry={refetch} />
      ) : loading && !data ? (
        <LoadingPanel />
      ) : !data ? null : data.cohorts.length === 0 ? (
        <EmptyPanel />
      ) : (
        <>
          <SummaryStrip data={data} />
          <CohortTable
            rows={sortedCohorts}
            sort={sort}
            onSort={handleSort}
          />
          <HeatmapSection
            rows={data.cohorts}
            expanded={showHeatmap}
            onToggle={() => setShowHeatmap(s => !s)}
          />
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Summary strip — 3 cards: trend / recent-vs-historical / best-worst
// ────────────────────────────────────────────────────────────

function SummaryStrip({ data }: { data: CohortsSnapshot }) {
  // Confidence gate for the trend label: if ANY contributing cohort is below
  // the small-cohort threshold, withhold the directional verdict and surface
  // "Insufficient signal" instead. The other 2 summary cards still render
  // their numbers — they become advisory rather than confident.
  const cohortsAreSparse = data.cohorts.some(c => c.size < SMALL_COHORT_THRESHOLD);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        gap: 16,
      }}
    >
      <TrendCard summary={data.summary} cohortsAreSparse={cohortsAreSparse} />
      <RecentVsHistoricalCard summary={data.summary} />
      <BestWorstCard summary={data.summary} />
    </div>
  );
}

function TrendCard({
  summary,
  cohortsAreSparse,
}: {
  summary: CohortSummary;
  cohortsAreSparse: boolean;
}) {
  // `as const` tokens collapse to literal types — widen explicitly so the
  // ternary-style branches can re-assign across hex strings.
  let Icon: typeof ArrowsLeftRight = ArrowsLeftRight;
  let color: string = TOKENS.textMuted;
  let label = 'Stable';
  let subtitle = 'Recent cohort performance is in line with historical baseline.';

  // The sparse-cohort gate wins over whatever the backend computed: the trend
  // label fakes confidence on small samples (one extra activation in a 20-user
  // cohort moves the rate by 5 pp), so we explicitly withhold the verdict.
  const displayedTrend: 'improving' | 'stable' | 'declining' | 'insufficient' =
    cohortsAreSparse ? 'insufficient' : summary.trend;

  if (displayedTrend === 'insufficient') {
    Icon = Warning;
    color = TOKENS.textFaint;
    label = 'Insufficient signal';
    subtitle = 'Some cohorts have < 100 users; trend label withheld.';
  } else if (displayedTrend === 'improving') {
    Icon = ArrowUp;
    color = TOKENS.threshold.green;
    label = 'Improving';
    subtitle = 'Recent cohorts are activating faster than older ones.';
  } else if (displayedTrend === 'declining') {
    Icon = ArrowDown;
    color = TOKENS.threshold.red;
    label = 'Declining';
    subtitle = 'Recent cohorts are activating slower than older ones.';
  }

  const isInsufficient = displayedTrend === 'insufficient';

  return (
    <div style={{ ...panelStyle, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={cardTitleStyle}>Trend</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <Icon
          size={isInsufficient ? 20 : 28}
          weight={isInsufficient ? 'fill' : 'bold'}
          color={color}
        />
        <div
          style={{
            fontSize: isInsufficient ? 18 : 22,
            fontWeight: 800,
            color,
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: TOKENS.textFaint,
          marginTop: 10,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function RecentVsHistoricalCard({ summary }: { summary: CohortSummary }) {
  const deltaColor: string =
    summary.deltaPP > 0
      ? TOKENS.threshold.green
      : summary.deltaPP < 0
        ? TOKENS.threshold.red
        : TOKENS.textMuted;
  const deltaSign = summary.deltaPP > 0 ? '+' : '';

  return (
    <div style={{ ...panelStyle, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={cardTitleStyle}>Recent vs Historical</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        <SummaryRow
          label="Recent (1–4)"
          value={`${summary.recentAvgActivation.toFixed(1)}%`}
          color={TOKENS.textPrimary}
        />
        <SummaryRow
          label="Historical (5–12)"
          value={`${summary.historicalAvgActivation.toFixed(1)}%`}
          color={TOKENS.textSecondary}
        />
        <div
          style={{
            marginTop: 4,
            paddingTop: 8,
            borderTop: `1px solid ${TOKENS.chartGrid}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span style={{ fontSize: 11, color: TOKENS.textMuted, letterSpacing: '0.05em' }}>
            Δ
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: deltaColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {deltaSign}
            {summary.deltaPP.toFixed(1)}pp
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: TOKENS.textMuted }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BestWorstCard({ summary }: { summary: CohortSummary }) {
  return (
    <div style={{ ...panelStyle, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={cardTitleStyle}>Best / Worst</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        <BestWorstRow
          label="Best"
          icon={<Trophy size={14} weight="bold" color={TOKENS.threshold.green} />}
          cohortKey={summary.bestCohort.cohortKey}
          activationPct={summary.bestCohort.activationPct}
          color={TOKENS.threshold.green}
        />
        <BestWorstRow
          label="Worst"
          icon={<Skull size={14} weight="bold" color={TOKENS.threshold.red} />}
          cohortKey={summary.worstCohort.cohortKey}
          activationPct={summary.worstCohort.activationPct}
          color={TOKENS.threshold.red}
        />
      </div>
    </div>
  );
}

function BestWorstRow({
  label,
  icon,
  cohortKey,
  activationPct,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  cohortKey: string;
  activationPct: number;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10, color: TOKENS.textFaint, letterSpacing: '0.05em' }}>
            {label}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: TOKENS.textPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {cohortKey}
          </span>
        </div>
      </div>
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {activationPct.toFixed(1)}%
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Cohort table
// ────────────────────────────────────────────────────────────

interface TableColumn {
  key: SortKey;
  label: string;
  align?: 'left' | 'right';
  /**
   * Optional formula tooltip. When provided, it's merged with the standard
   * "Sort by …" hint on the header's `title` attribute so operators can
   * inspect the exact computation behind a metric on hover.
   */
  tooltip?: string;
  /** When set, renders a FlagButton in this column header's negative space. */
  flagMetricId?: string;
}

const COLUMNS: TableColumn[] = [
  { key: 'cohortKey', label: 'Cohort', align: 'left' },
  { key: 'size', label: 'Size', align: 'right' },
  { key: 'activationPct', label: 'Act %', align: 'right' },
  { key: 'retentionWeek1', label: 'W1 Ret', align: 'right' },
  { key: 'retentionWeek4', label: 'W4 Ret', align: 'right', flagMetricId: HUB_METRIC_IDS.COHORTS_RETENTION_W4 },
  { key: 'avgVolumePerUser', label: 'LTV/User', align: 'right' },
  { key: 'whales', label: 'Whales', align: 'right' },
  {
    key: 'stitchPct',
    label: 'ID Coverage',
    align: 'right',
    tooltip: '% of cohort with 2+ distinct identity types',
  },
];

function CohortTable({
  rows,
  sort,
  onSort,
}: {
  rows: CohortEntry[];
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={cardTitleStyle}>Weekly Cohorts</div>
        <div style={{ fontSize: 10, color: TOKENS.textFaint, letterSpacing: '0.05em' }}>
          {rows.length} cohorts · newest first
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <HeaderCell
                  key={col.key}
                  column={col}
                  active={sort.key === col.key}
                  dir={sort.key === col.key ? sort.dir : null}
                  onClick={() => onSort(col.key)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <CohortRow key={row.cohortKey} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({
  column,
  active,
  dir,
  onClick,
}: {
  column: TableColumn;
  active: boolean;
  dir: SortDir | null;
  onClick: () => void;
}) {
  const Caret = dir === 'asc' ? CaretUp : CaretDown;
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: column.align ?? 'left',
        padding: '10px 16px',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: active ? TOKENS.accent : TOKENS.textFaint,
        borderBottom: `1px solid ${TOKENS.chartGrid}`,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        transition: `color ${MOTION.fast}`,
      }}
      title={
        column.tooltip
          ? `${column.tooltip} · Sort by ${column.label}`
          : `Sort by ${column.label}`
      }
    >
      <span
        className={column.flagMetricId ? FLAG_AFFORDANCE_HOST_CLASS : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: column.align === 'right' ? 'flex-end' : 'flex-start',
          width: '100%',
          position: 'relative',
        }}
      >
        {column.label}
        {active ? <Caret size={9} weight="bold" /> : null}
        {column.flagMetricId && (
          <ReconciliationBadge metricId={column.flagMetricId} />
        )}
        {column.flagMetricId && (
          <FlagButton
            tab={HUB_TABS.COHORTS}
            metricId={column.flagMetricId}
            displayedValue={`column:${column.key}`}
          />
        )}
      </span>
    </th>
  );
}

function CohortRow({ row }: { row: CohortEntry }) {
  const actColor = activationColor(row.activationPct);
  const stColor = stitchColor(row.stitchPct);

  // Small-cohort gate: gray out the row visually and announce the caveat to
  // screen readers. The numbers still render — operators can read them — but
  // they're explicitly marked as advisory rather than authoritative.
  const isSmallCohort = row.size < SMALL_COHORT_THRESHOLD;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${TOKENS.chartGrid}`,
        transition: `background ${MOTION.fast}`,
        opacity: isSmallCohort ? 0.55 : 1,
      }}
      aria-label={
        isSmallCohort
          ? `Small cohort (${row.size} users) — retention rates may be noisy`
          : undefined
      }
      onMouseEnter={e => {
        e.currentTarget.style.background = TOKENS.tableRowHover;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <td style={cellStyle('left', TOKENS.textPrimary, 13, 800)} title={row.weekStart}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {row.cohortKey}
          {isSmallCohort ? (
            <span
              title="Cohort size below 100 — retention noisy"
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <Warning
                size={10}
                weight="fill"
                color={TOKENS.threshold.yellow}
                aria-hidden
              />
            </span>
          ) : null}
        </span>
      </td>
      <td style={cellStyle('right', TOKENS.textSecondary)}>{row.size.toLocaleString()}</td>
      <td style={cellStyle('right', actColor, 13, 800)}>
        {row.activationPct.toFixed(1)}%
      </td>
      <td style={cellStyle('right', TOKENS.textSecondary)}>
        {row.retentionWeek1 === null ? '—' : `${row.retentionWeek1.toFixed(1)}%`}
      </td>
      <td style={cellStyle('right', TOKENS.textSecondary)}>
        {row.retentionWeek4 === null ? '—' : `${row.retentionWeek4.toFixed(1)}%`}
      </td>
      <td style={cellStyle('right', TOKENS.textSecondary)}>
        {row.avgVolumePerUser > 0 ? fmtUSD(row.avgVolumePerUser) : '—'}
      </td>
      <td style={cellStyle('right', TOKENS.textSecondary)}>
        {row.whales.toLocaleString()}
      </td>
      <td style={cellStyle('right', stColor, 13, 800)}>{row.stitchPct.toFixed(1)}%</td>
    </tr>
  );
}

function cellStyle(
  align: 'left' | 'right',
  color: string,
  size = 12,
  weight = 600,
): React.CSSProperties {
  return {
    textAlign: align,
    padding: '12px 16px',
    fontSize: size,
    fontWeight: weight,
    color,
    whiteSpace: 'nowrap',
  };
}

// ────────────────────────────────────────────────────────────
// Retention heatmap (collapsible, off by default)
//
// 12 × 12 grid: rows = cohorts (newest top), cols = week offsets 0..11.
// Cell color = % retained on a white→accent gradient. "—" when the cohort
// is too young for that offset.
//
// Activation % drives offset-0 (the cohort's own activation). Offset 1 and
// offset 4 use retentionWeek1 / retentionWeek4 from the API. Intermediate
// offsets (2, 3, 5..11) aren't computed server-side yet — display "—".
// This is intentional: the operator gets cells for what we know,
// em-dashes for what we don't, no fake interpolation.
// ────────────────────────────────────────────────────────────

function HeatmapSection({
  rows,
  expanded,
  onToggle,
}: {
  rows: CohortEntry[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ ...panelStyle, padding: 0 }}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: TOKENS.textPrimary,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {expanded ? (
            <CaretDown size={14} weight="bold" color={TOKENS.accent} />
          ) : (
            <CaretRight size={14} weight="bold" color={TOKENS.accent} />
          )}
          <span style={{ ...cardTitleStyle, margin: 0 }}>Retention Heatmap</span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: TOKENS.textFaint,
            letterSpacing: '0.05em',
          }}
        >
          {expanded ? 'hide' : 'show'}
        </span>
      </button>

      {expanded ? <HeatmapGrid rows={rows} /> : null}
    </div>
  );
}

const OFFSET_COUNT = 12;

function HeatmapGrid({ rows }: { rows: CohortEntry[] }) {
  // Use the cohorts as-is (newest first per API contract).
  const displayRows = rows.slice(0, OFFSET_COUNT);

  // Max-row of the highest retention seen anywhere in the grid drives the
  // color ramp's upper bound. Caps at 100 to keep the gradient predictable.
  const maxRetention = useMemo(() => {
    let max = 0;
    for (const r of displayRows) {
      const candidates = [
        r.activationPct,
        r.retentionWeek1 ?? 0,
        r.retentionWeek4 ?? 0,
      ];
      for (const c of candidates) if (c > max) max = c;
    }
    return Math.min(100, Math.max(max, 1));
  }, [displayRows]);

  return (
    <div
      style={{
        padding: '0 20px 20px',
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `64px repeat(${OFFSET_COUNT}, 32px)`,
          gap: 2,
          alignItems: 'center',
        }}
      >
        {/* Header row */}
        <div />
        {Array.from({ length: OFFSET_COUNT }, (_, i) => (
          <div
            key={`h-${i}`}
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: TOKENS.textFaint,
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            W{i}
          </div>
        ))}

        {/* Body rows */}
        {displayRows.map(row => (
          <React.Fragment key={row.cohortKey}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: TOKENS.textSecondary,
                fontVariantNumeric: 'tabular-nums',
                paddingRight: 6,
              }}
              title={`Cohort ${row.cohortKey} (week starting ${row.weekStart})`}
            >
              {row.cohortKey}
            </div>
            {Array.from({ length: OFFSET_COUNT }, (_, offset) => {
              const value = retentionForOffset(row, offset);
              return (
                <HeatmapCell
                  key={`${row.cohortKey}-${offset}`}
                  value={value}
                  maxRetention={maxRetention}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 10, color: TOKENS.textFaint, lineHeight: 1.5 }}>
        Color = % retained. Cells show offset-0 (activation), W1, and W4 only —
        other offsets render as &mdash; until we ship daily retention windows.
      </div>
    </div>
  );
}

/** Returns the retention value for a row at a given week offset, or null if not known. */
function retentionForOffset(row: CohortEntry, offset: number): number | null {
  if (offset === 0) return row.activationPct;
  if (offset === 1) return row.retentionWeek1;
  if (offset === 4) return row.retentionWeek4;
  return null;
}

function HeatmapCell({
  value,
  maxRetention,
}: {
  value: number | null;
  maxRetention: number;
}) {
  if (value === null) {
    return (
      <div
        style={{
          height: 32,
          background: TOKENS.chartGrid,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: TOKENS.textFaint,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        —
      </div>
    );
  }

  // White → accent gradient. Intensity = value / maxRetention, clamped [0,1].
  // Background = accent tinted at `intensity` alpha; text gets a dark color on
  // bright cells, light on dim cells for legibility.
  const intensity = Math.max(0, Math.min(1, value / maxRetention));
  const bg = `rgba(0, 200, 150, ${0.06 + intensity * 0.84})`;
  const textColor = intensity > 0.55 ? '#031a13' : TOKENS.textPrimary;

  return (
    <div
      style={{
        height: 32,
        background: bg,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 800,
        color: textColor,
        fontVariantNumeric: 'tabular-nums',
        transition: `background ${MOTION.medium}`,
      }}
      title={`${value.toFixed(1)}%`}
    >
      {Math.round(value)}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Empty / loading / error states
// ────────────────────────────────────────────────────────────

function LoadingPanel() {
  return (
    <div
      style={{
        ...panelStyle,
        padding: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: TOKENS.textMuted,
      }}
    >
      <CircleNotch
        size={16}
        weight="bold"
        style={{ animation: 'cohorts-spin 800ms linear infinite' }}
      />
      <style>{`@keyframes cohorts-spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 12 }}>Loading cohort data…</span>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        ...panelStyle,
        border: '1px solid rgba(255,90,90,0.3)',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <Warning size={24} weight="regular" color={TOKENS.threshold.red} />
      <div style={{ color: TOKENS.threshold.red, fontWeight: 700, fontSize: 12 }}>
        {message}
      </div>
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

function EmptyPanel() {
  return (
    <div
      style={{
        ...panelStyle,
        padding: 48,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Users size={28} color={TOKENS.textFaint} />
      <div style={{ color: TOKENS.textPrimary, fontWeight: 800, fontSize: 18 }}>
        No cohort data yet
      </div>
      <div style={{ color: TOKENS.textMuted, fontSize: 12, maxWidth: 360 }}>
        Cohorts begin populating once new profiles sign up. Check back after the
        first wave of registrations.
      </div>
    </div>
  );
}
