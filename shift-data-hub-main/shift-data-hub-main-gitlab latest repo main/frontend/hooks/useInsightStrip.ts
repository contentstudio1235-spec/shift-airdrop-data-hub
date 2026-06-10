"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { Filters } from './useFilters';
import { selectInsights, type InsightContext, type InsightPriority } from '@/components/DataHub/insights/insightTemplates';

export interface RenderedInsight {
  id: number;
  priority: InsightPriority;
  text: string;
}

export function useInsightStrip(filters: Filters): RenderedInsight[] {
  const [insights, setInsights] = useState<RenderedInsight[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        const [acq, channelRoi, referral] = await Promise.allSettled([
          apiGet<any>('/api/funnels/acquisition', { query: { ...filters, from: sevenDaysAgo } }),
          apiGet<any>('/api/attribution/channel-roi', { query: { ...filters, from: sevenDaysAgo } }),
          apiGet<any>('/api/funnels/referral', { query: { ...filters, from: thirtyDaysAgo } }),
        ]);

        const ctx: InsightContext = {};

        if (acq.status === 'fulfilled') {
          const acqRes = acq.value;
          if (acqRes.stitchedPct !== undefined) {
            ctx.attributionCoveragePct = acqRes.attributablePct ?? acqRes.stitchedPct;
            const connectStep = acqRes.steps?.find((s: any) => s.id === 'connect');
            if (connectStep && ctx.attributionCoveragePct !== undefined) {
              ctx.uncoveredWalletCount = Math.round(connectStep.count * (1 - ctx.attributionCoveragePct / 100));
            }
          }
          if (acqRes.medianTimeToFirstTrade) {
            ctx.medianHoursToTrade = acqRes.medianTimeToFirstTrade / 3600;
          }
        }

        // channelRoi WoW comparison deferred to Sprint 2 (needs historical join)

        if (referral.status === 'fulfilled' && referral.value.steps) {
          const stepBy = (id: string) => referral.value.steps.find((s: any) => s.id === id);
          const kGen = (stepBy('code_generated')?.conversionFromPrev ?? 0) / 100;
          const kClicks = (stepBy('referral_clicked')?.conversionFromPrev ?? 0) / 100;
          const kConvert = (stepBy('referral_traded')?.conversionFromPrev ?? 0) / 100;
          const K = kGen * kClicks * kConvert;
          ctx.viralK = K;
          const components = [
            { name: 'K_gen', pct: kGen * 100 },
            { name: 'K_clicks', pct: kClicks * 100 },
            { name: 'K_convert', pct: kConvert * 100 },
          ];
          ctx.viralKComponent = components.reduce((a, b) => a.pct >= b.pct ? a : b);
        }

        if (!cancelled) {
          const rendered: RenderedInsight[] = selectInsights(ctx).map(t => ({
            id: t.id,
            priority: t.priority,
            text: t.render(ctx),
          }));
          setInsights(rendered);
        }
      } catch {
        if (!cancelled) setInsights([]);
      }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(filters)]);

  return insights;
}
