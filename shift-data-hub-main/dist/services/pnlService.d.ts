import type { Position } from '../types';
export interface PnLData {
    unrealizedUsd: number;
    unrealizedPct: number;
    realizedUsd: number;
    realizedPct: number;
    totalPnL: number;
    totalPnLPct: number;
}
export interface DashboardPnLData {
    totalUnrealizedPnL: number;
    totalRealizedPnL: number;
    totalPnLUsd: number;
    totalPnLPct: number;
}
/**
 * Calculate P&L for a single position
 * Returns null if price_at_open is not available
 */
export declare function calculatePositionPnL(position: Position, currentPrice: number): PnLData | null;
/**
 * Calculate dashboard-level P&L summary
 * Accepts either Map<string, number> or Record<string, number> for prices
 */
export declare function calculateDashboardPnL(positions: Position[], prices: Map<string, number> | Record<string, number>): DashboardPnLData;
/**
 * Format P&L for display
 */
export declare function formatPnL(pnl: PnLData | null): {
    usd: string;
    pct: string;
    isGain: boolean;
};
/**
 * Get P&L badge styling (color + icon)
 */
export declare function getPnLStyle(pnl: PnLData | null): {
    color: string;
    bgColor: string;
    icon: string;
    cssClass: string;
};
//# sourceMappingURL=pnlService.d.ts.map