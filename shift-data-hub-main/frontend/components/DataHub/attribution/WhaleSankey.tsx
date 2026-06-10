"use client";
import React, { useMemo } from 'react';
import { sankey, sankeyLinkHorizontal, type SankeyGraph, type SankeyLink, type SankeyNode as D3SankeyNode } from 'd3-sankey';
import { Waves, CircleNotch, Warning } from '@phosphor-icons/react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import type { WhaleOriginsPayload, SankeyNode, SankeyNodeKind } from '@/hooks/useWhaleOrigins';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface InternalNode {
  id: string;
  label: string;
  kind: SankeyNodeKind;
  value: number;
}

interface InternalLink {
  source: string;
  target: string;
  value: number;
}

// d3-sankey augmented node
type LayoutNode = D3SankeyNode<InternalNode, InternalLink>;
// d3-sankey augmented link
type LayoutLink = SankeyLink<InternalNode, InternalLink>;

type LayoutGraph = SankeyGraph<InternalNode, InternalLink>;

// ─── Color helpers ─────────────────────────────────────────────────────────────

function nodeColor(node: InternalNode): { fill: string; stroke: string } {
  if (node.kind === 'source') {
    return {
      fill: TOKENS.chartFill,
      stroke: TOKENS.nodeSourceStroke,
    };
  }
  if (node.kind === 'cohort') {
    const lbl = node.label.toLowerCase();
    if (lbl.includes('whale')) {
      return { fill: 'rgba(94,224,168,0.18)', stroke: TOKENS.threshold.green };
    }
    if (lbl.includes('dolphin')) {
      return { fill: TOKENS.accentDim, stroke: TOKENS.accentBorder };
    }
    return { fill: 'rgba(58,112,96,0.15)', stroke: TOKENS.textFaint };
  }
  // outcome
  const lbl = node.label.toLowerCase();
  if (lbl.includes('active')) {
    return { fill: 'rgba(94,224,168,0.18)', stroke: TOKENS.threshold.green };
  }
  if (lbl.includes('dormant')) {
    return { fill: 'rgba(255,154,60,0.12)', stroke: TOKENS.threshold.yellow };
  }
  return { fill: 'rgba(255,90,90,0.12)', stroke: TOKENS.threshold.red };
}

// Edge stroke = target node's semantic stroke color
function edgeStrokeColor(target: InternalNode): string {
  if (target.kind === 'source') return TOKENS.nodeSourceStroke;
  if (target.kind === 'cohort') {
    const lbl = target.label.toLowerCase();
    if (lbl.includes('whale')) return TOKENS.threshold.green;
    if (lbl.includes('dolphin')) return TOKENS.accent;
    return TOKENS.textFaint;
  }
  // outcome
  const lbl = target.label.toLowerCase();
  if (lbl.includes('active')) return TOKENS.threshold.green;
  if (lbl.includes('dormant')) return TOKENS.threshold.yellow;
  return TOKENS.threshold.red;
}

// ─── Card shell ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: TOKENS.panel,
  backdropFilter: `blur(${TOKENS.glassBlur})`,
  border: `1px solid ${TOKENS.accentBorder}`,
  borderRadius: 16,
  padding: 24,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  height: 480,
  display: 'flex',
  flexDirection: 'column',
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const SVG_W = 1100;
const SVG_H = 380;
const NODE_W = 12;
const NODE_PAD = 14;

// ─── Component ─────────────────────────────────────────────────────────────────

export interface WhaleSankeyProps {
  data: WhaleOriginsPayload | null;
  loading: boolean;
  error: string | null;
}

export function WhaleSankey({ data, loading, error }: WhaleSankeyProps) {
  // Build the sankey layout only when data is available and threshold is met
  const graph = useMemo<LayoutGraph | null>(() => {
    if (!data || data.totals.sourceUsers < 20) return null;

    const nodeIds = new Set(data.nodes.map((n) => n.id));
    const nodes: InternalNode[] = data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      value: n.value,
    }));

    const links: InternalLink[] = [];
    for (const e of data.edges) {
      if (!nodeIds.has(e.from) || !nodeIds.has(e.to) || e.value <= 0) continue;
      links.push({ source: e.from, target: e.to, value: e.value });
    }

    if (links.length === 0) return null;

    const layout = sankey<InternalNode, InternalLink>()
      .nodeId((d) => d.id)
      .nodeWidth(NODE_W)
      .nodePadding(NODE_PAD)
      .extent([[0, 0], [SVG_W, SVG_H]]);

    try {
      return layout({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) });
    } catch {
      return null;
    }
  }, [data]);

  // Source-node totals for edge label filtering (edge >= 5% of its source's total)
  const sourceTotals = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>();
    if (!graph) return m;
    for (const node of graph.nodes) {
      const links = (node as LayoutNode).sourceLinks ?? [];
      const total = links.reduce((s: number, l: LayoutLink) => s + l.value, 0);
      m.set((node as LayoutNode).id as string, total);
    }
    return m;
  }, [graph]);

  const maxEdgeValue = useMemo<number>(() => {
    if (!graph) return 1;
    return Math.max(1, ...graph.links.map((l) => l.value));
  }, [graph]);

  const sourceCount = data?.nodes.filter((n) => n.kind === 'source').length ?? 0;

  return (
    <div style={cardStyle}>
      {/* Keyframes */}
      <style>{`
        @keyframes sankey-spin { to { transform: rotate(360deg) } }
        @media (prefers-reduced-motion: reduce) {
          .sankey-edge { transition: none !important; }
        }
      `}</style>

      {/* Title strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <Waves size={12} weight="bold" color={TOKENS.textFaint} />
        <div
          role="heading"
          aria-level={3}
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: TOKENS.textFaint,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          Whale Origins
        </div>
        {data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: TOKENS.accent }}>
              {data.totals.whales.toLocaleString()}
            </span>
            <span style={{ fontSize: 10, color: TOKENS.textFaint }}>whales attributed</span>
          </div>
        )}
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 11, color: TOKENS.textMuted, marginBottom: 8, flexShrink: 0 }}>
        Source → cohort → outcome. Width ∝ user count.
      </div>

      {/* SVG area */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : !data || data.totals.sourceUsers < 20 ? (
          <EmptyState count={data?.totals.sourceUsers ?? 0} />
        ) : !graph ? (
          <EmptyState count={data.totals.sourceUsers} />
        ) : (
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%' }}
            role="img"
            aria-label={`Whale origin flow diagram showing ${data.totals.whales} whales from ${sourceCount} sources`}
          >
            {/* Stage labels */}
            <StageLabels nodes={graph.nodes as LayoutNode[]} />

            {/* Edges */}
            {(graph.links as LayoutLink[]).map((link, i) => {
              const srcNode = link.source as LayoutNode;
              const tgtNode = link.target as LayoutNode;
              const tgtData = tgtNode as unknown as InternalNode;
              const color = edgeStrokeColor(tgtData);
              const sw = Math.max(1, Math.min(24, (link.value / maxEdgeValue) * 24));
              const pathD = sankeyLinkHorizontal()(link) ?? '';

              const srcData = srcNode as unknown as InternalNode;
              const srcTotal = sourceTotals.get(srcData.id) ?? link.value;
              const pct = srcTotal > 0 ? link.value / srcTotal : 0;
              const showLabel = pct >= 0.05;
              const pctLabel = `${Math.round(pct * 100)}%`;
              const titleText = `${srcData.label} → ${tgtData.label}: ${link.value.toLocaleString()} users (${Math.round(pct * 100)}%)`;

              return (
                <g key={`link-${i}`}>
                  <path
                    className="sankey-edge"
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.35}
                    strokeWidth={sw}
                    style={{ transition: `stroke-opacity 180ms ease-out` }}
                    onMouseEnter={(e) => { (e.currentTarget as SVGPathElement).style.strokeOpacity = '0.7'; }}
                    onMouseLeave={(e) => { (e.currentTarget as SVGPathElement).style.strokeOpacity = '0.35'; }}
                  >
                    <title>{titleText}</title>
                  </path>
                  {showLabel && (
                    <EdgeLabel link={link} label={pctLabel} />
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {(graph.nodes as LayoutNode[]).map((node, i) => {
              const nodeData = node as unknown as InternalNode;
              const { fill, stroke } = nodeColor(nodeData);
              const x0 = node.x0 ?? 0;
              const x1 = node.x1 ?? 0;
              const y0 = node.y0 ?? 0;
              const y1 = node.y1 ?? 0;
              const nodeH = Math.max(2, y1 - y0);
              const titleText = `${nodeData.label}: ${nodeData.value.toLocaleString()} users`;

              return (
                <g key={`node-${i}`}>
                  <rect
                    x={x0}
                    y={y0}
                    width={x1 - x0}
                    height={nodeH}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                    rx={2}
                  >
                    <title>{titleText}</title>
                  </rect>
                  <NodeLabel node={node} nodeData={nodeData} />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Stage labels ──────────────────────────────────────────────────────────────

function StageLabels({ nodes }: { nodes: LayoutNode[] }) {
  // Find first node of each kind to get column x position
  const sourceNode = nodes.find((n) => (n as unknown as InternalNode).kind === 'source');
  const cohortNode = nodes.find((n) => (n as unknown as InternalNode).kind === 'cohort');
  const outcomeNode = nodes.find((n) => (n as unknown as InternalNode).kind === 'outcome');

  const labels: Array<{ x: number; text: string }> = [];
  if (sourceNode?.x0 !== undefined) labels.push({ x: (sourceNode.x0 + (sourceNode.x1 ?? 0)) / 2, text: 'SOURCE' });
  if (cohortNode?.x0 !== undefined) labels.push({ x: (cohortNode.x0 + (cohortNode.x1 ?? 0)) / 2, text: 'COHORT' });
  if (outcomeNode?.x0 !== undefined) labels.push({ x: (outcomeNode.x0 + (outcomeNode.x1 ?? 0)) / 2, text: 'OUTCOME' });

  return (
    <>
      {labels.map(({ x, text }) => (
        <text
          key={text}
          x={x}
          y={-6}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill={TOKENS.textFaint}
          letterSpacing="0.14em"
          style={{ textTransform: 'uppercase' }}
        >
          {text}
        </text>
      ))}
    </>
  );
}

// ─── Node labels ───────────────────────────────────────────────────────────────

function NodeLabel({ node, nodeData }: { node: LayoutNode; nodeData: InternalNode }) {
  const x0 = node.x0 ?? 0;
  const x1 = node.x1 ?? 0;
  const y0 = node.y0 ?? 0;
  const y1 = node.y1 ?? 0;
  const midY = (y0 + y1) / 2;
  const GAP = 8;

  if (nodeData.kind === 'source') {
    return (
      <>
        <text
          x={x0 - GAP}
          y={midY - 6}
          textAnchor="end"
          fontSize={10}
          fontWeight={700}
          fill={TOKENS.textFaint}
          letterSpacing="0.14em"
          style={{ textTransform: 'uppercase' }}
        >
          {nodeData.label.toUpperCase()}
        </text>
        <text
          x={x0 - GAP}
          y={midY + 8}
          textAnchor="end"
          fontSize={12}
          fontWeight={800}
          fill={TOKENS.textSecondary}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {nodeData.value.toLocaleString()}
        </text>
      </>
    );
  }

  if (nodeData.kind === 'cohort') {
    return (
      <>
        <text
          x={(x0 + x1) / 2}
          y={y0 - GAP - 10}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill={TOKENS.textFaint}
          letterSpacing="0.14em"
          style={{ textTransform: 'uppercase' }}
        >
          {nodeData.label.toUpperCase()}
        </text>
        <text
          x={(x0 + x1) / 2}
          y={y0 - GAP}
          textAnchor="middle"
          fontSize={12}
          fontWeight={800}
          fill={TOKENS.textSecondary}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {nodeData.value.toLocaleString()}
        </text>
      </>
    );
  }

  // outcome — right of node
  return (
    <>
      <text
        x={x1 + GAP}
        y={midY - 6}
        textAnchor="start"
        fontSize={10}
        fontWeight={700}
        fill={TOKENS.textFaint}
        letterSpacing="0.14em"
        style={{ textTransform: 'uppercase' }}
      >
        {nodeData.label.toUpperCase()}
      </text>
      <text
        x={x1 + GAP}
        y={midY + 8}
        textAnchor="start"
        fontSize={12}
        fontWeight={800}
        fill={TOKENS.textSecondary}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {nodeData.value.toLocaleString()}
      </text>
    </>
  );
}

// ─── Edge labels ───────────────────────────────────────────────────────────────

function EdgeLabel({ link, label }: { link: LayoutLink; label: string }) {
  const src = link.source as LayoutNode;
  const tgt = link.target as LayoutNode;
  // Midpoint X: between source right edge and target left edge
  const mx = ((src.x1 ?? 0) + (tgt.x0 ?? 0)) / 2;
  // Midpoint Y: average of source and target link vertical positions
  const sy0 = link.y0 ?? 0;
  const ty1 = link.y1 ?? 0;
  const my = (sy0 + ty1) / 2 - 10;

  return (
    <text
      x={mx}
      y={my}
      textAnchor="middle"
      fontSize={9}
      fontWeight={600}
      fill={TOKENS.textMuted}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {label}
    </text>
  );
}

// ─── States ────────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <CircleNotch
        size={16}
        weight="bold"
        color={TOKENS.textMuted}
        style={{ animation: 'sankey-spin 800ms linear infinite' }}
      />
      <span style={{ fontSize: 12, color: TOKENS.textMuted }}>Loading flow data…</span>
    </div>
  );
}

function EmptyState({ count }: { count: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <Waves size={32} weight="regular" color={TOKENS.textFaint} />
      <div
        style={{
          fontSize: 12,
          color: TOKENS.textMuted,
          fontWeight: 600,
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        Sankey needs at least 20 attributed users — current: {count}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Warning size={24} weight="regular" color={TOKENS.threshold.red} />
      <span style={{ fontSize: 12, color: TOKENS.threshold.red, fontWeight: 700 }}>{message}</span>
    </div>
  );
}
