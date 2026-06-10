// frontend/components/DataHub/insights/insightTemplates.ts
// Templates per Analytics Reporter §4. Each template is rendered client-side
// when its trigger condition fires. Templates render to a single string ≤120 chars.

export type InsightPriority = 'P1' | 'P2' | 'P3';

export interface InsightContext {
  topGrowingSource?: { source: string; pct: number };
  comparatorSource?: { source: string; pct: number };
  whaleSilverToGoldPct?: number;
  whaleSilverToGoldDeltaPct?: number;
  medianHoursToTrade?: number;
  medianHoursDeltaPct?: number;
  attributionCoveragePct?: number;
  uncoveredWalletCount?: number;
  viralK?: number;
  viralKComponent?: { name: string; pct: number };
  topKolHandle?: string;
  topKolTrades?: number;
  topKolVolume?: number;
}

export interface InsightTemplate {
  id: number;
  priority: InsightPriority;
  trigger: (ctx: InsightContext) => boolean;
  render: (ctx: InsightContext) => string;
}

const TEMPLATES: InsightTemplate[] = [
  {
    id: 1,
    priority: 'P1',
    trigger: ctx =>
      !!ctx.topGrowingSource && ctx.topGrowingSource.pct > 20 &&
      !!ctx.comparatorSource && ctx.comparatorSource.pct < -10,
    render: ctx =>
      `Wallet connects from ${ctx.topGrowingSource!.source} up ${ctx.topGrowingSource!.pct.toFixed(0)}% WoW — ${ctx.comparatorSource!.source} down ${Math.abs(ctx.comparatorSource!.pct).toFixed(0)}%.`,
  },
  {
    id: 2,
    priority: 'P2',
    trigger: ctx => ctx.whaleSilverToGoldPct !== undefined,
    render: ctx => {
      const arrow = (ctx.whaleSilverToGoldDeltaPct ?? 0) >= 0 ? '↑' : '↓';
      return `Whale Silver→Gold conversion at ${ctx.whaleSilverToGoldPct!.toFixed(1)}% this week (${arrow} ${Math.abs(ctx.whaleSilverToGoldDeltaPct ?? 0).toFixed(0)}% vs prior 7d).`;
    },
  },
  {
    id: 3,
    priority: 'P2',
    trigger: ctx =>
      ctx.medianHoursToTrade !== undefined && Math.abs(ctx.medianHoursDeltaPct ?? 0) > 20,
    render: ctx => {
      const arrow = (ctx.medianHoursDeltaPct ?? 0) >= 0 ? '↑' : '↓';
      return `Median time landing → first_trade now ${ctx.medianHoursToTrade!.toFixed(1)}h (${arrow} ${Math.abs(ctx.medianHoursDeltaPct ?? 0).toFixed(0)}% vs prior 7d).`;
    },
  },
  {
    id: 6,
    priority: 'P1',
    trigger: ctx => ctx.attributionCoveragePct !== undefined && ctx.attributionCoveragePct < 80,
    render: ctx =>
      `Attribution coverage at ${ctx.attributionCoveragePct!.toFixed(0)}% — ${ctx.uncoveredWalletCount ?? '?'} wallet_connects in last 7d had no resolved source.`,
  },
  {
    id: 5,
    priority: 'P2',
    trigger: ctx => ctx.viralK !== undefined,
    render: ctx => {
      const color = ctx.viralK! >= 0.45 ? 'green' : ctx.viralK! >= 0.20 ? 'yellow' : 'red';
      const c = ctx.viralKComponent;
      return `Viral K reached ${ctx.viralK!.toFixed(2)} (${color})${c ? ` — driven by ${c.name} at ${c.pct.toFixed(0)}%` : ''}.`;
    },
  },
  {
    id: 7,
    priority: 'P3',
    trigger: ctx => !!ctx.topKolHandle && (ctx.topKolTrades ?? 0) >= 10,
    render: ctx =>
      `${ctx.topKolHandle} attributed ${ctx.topKolTrades} first_trades and $${((ctx.topKolVolume ?? 0) / 1000).toFixed(1)}K volume in last 7d.`,
  },
];

export function selectInsights(ctx: InsightContext): InsightTemplate[] {
  return TEMPLATES.filter(t => t.trigger(ctx))
    .sort((a, b) => {
      const order: Record<InsightPriority, number> = { P1: 0, P2: 1, P3: 2 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 3);
}
