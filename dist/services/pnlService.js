"use strict";
// ============================================================
// P&L Service — Calculate profit/loss for positions
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePositionPnL = calculatePositionPnL;
exports.calculateDashboardPnL = calculateDashboardPnL;
exports.formatPnL = formatPnL;
exports.getPnLStyle = getPnLStyle;
/**
 * Calculate P&L for a single position
 * Returns null if price_at_open is not available
 */
function calculatePositionPnL(position, currentPrice) {
    // If no entry price recorded, can't calculate P&L
    if (!position.price_at_open || position.price_at_open === 0) {
        return null;
    }
    const tokenAmount = position.token_amount || 0;
    if (tokenAmount === 0) {
        return null;
    }
    // Unrealized P&L (for all open positions)
    const unrealizedUsd = (currentPrice - position.price_at_open) * tokenAmount;
    const unrealizedPct = ((currentPrice - position.price_at_open) / position.price_at_open) * 100;
    // Realized P&L (only for closed positions with price_at_close)
    let realizedUsd = 0;
    let realizedPct = 0;
    if (position.status === 'closed' && position.price_at_close) {
        realizedUsd = (position.price_at_close - position.price_at_open) * tokenAmount;
        realizedPct =
            ((position.price_at_close - position.price_at_open) /
                position.price_at_open) *
                100;
    }
    const totalPnL = unrealizedUsd + realizedUsd;
    // For total percentage, use the entry price as baseline
    const totalPnLPct = totalPnL === 0 ? 0 : (totalPnL / (position.price_at_open * tokenAmount)) * 100;
    return {
        unrealizedUsd: Number(unrealizedUsd.toFixed(2)),
        unrealizedPct: Number(unrealizedPct.toFixed(2)),
        realizedUsd: Number(realizedUsd.toFixed(2)),
        realizedPct: Number(realizedPct.toFixed(2)),
        totalPnL: Number(totalPnL.toFixed(2)),
        totalPnLPct: Number(totalPnLPct.toFixed(2)),
    };
}
/**
 * Calculate dashboard-level P&L summary
 * Accepts either Map<string, number> or Record<string, number> for prices
 */
function calculateDashboardPnL(positions, prices) {
    let totalUnrealizedUsd = 0;
    let totalRealizedUsd = 0;
    let totalInitialValue = 0;
    for (const position of positions) {
        let currentPrice = 0;
        if (prices instanceof Map) {
            currentPrice = prices.get(position.asset) || 0;
        }
        else {
            currentPrice = prices[position.asset] || 0;
        }
        const pnl = calculatePositionPnL(position, currentPrice);
        if (pnl) {
            totalUnrealizedUsd += pnl.unrealizedUsd;
            totalRealizedUsd += pnl.realizedUsd;
            // For overall percentage, track initial portfolio value
            const initialValue = (position.price_at_open || 0) * (position.token_amount || 0);
            totalInitialValue += initialValue;
        }
    }
    const totalPnLUsd = totalUnrealizedUsd + totalRealizedUsd;
    const totalPnLPct = totalInitialValue === 0
        ? 0
        : (totalPnLUsd / totalInitialValue) * 100;
    return {
        totalUnrealizedPnL: Number(totalUnrealizedUsd.toFixed(2)),
        totalRealizedPnL: Number(totalRealizedUsd.toFixed(2)),
        totalPnLUsd: Number(totalPnLUsd.toFixed(2)),
        totalPnLPct: Number(totalPnLPct.toFixed(2)),
    };
}
/**
 * Format P&L for display
 */
function formatPnL(pnl) {
    if (!pnl) {
        return { usd: 'N/A', pct: 'N/A', isGain: false };
    }
    const sign = pnl.totalPnL >= 0 ? '+' : '';
    const isGain = pnl.totalPnL >= 0;
    return {
        usd: `${sign}$${Math.abs(pnl.totalPnL).toFixed(2)}`,
        pct: `${sign}${pnl.totalPnLPct.toFixed(2)}%`,
        isGain,
    };
}
/**
 * Get P&L badge styling (color + icon)
 */
function getPnLStyle(pnl) {
    if (!pnl) {
        return {
            color: '#6B7280',
            bgColor: '#F3F4F6',
            icon: '⚪',
            cssClass: 'text-gray-600 bg-gray-100',
        };
    }
    if (pnl.totalPnL > 0) {
        return {
            color: '#16A34A',
            bgColor: '#ECFDF5',
            icon: '🟢',
            cssClass: 'text-emerald-700 bg-emerald-50',
        };
    }
    if (pnl.totalPnL < 0) {
        return {
            color: '#DC2626',
            bgColor: '#FEF2F2',
            icon: '🔴',
            cssClass: 'text-red-700 bg-red-50',
        };
    }
    // Break-even
    return {
        color: '#6B7280',
        bgColor: '#F3F4F6',
        icon: '⚪',
        cssClass: 'text-gray-600 bg-gray-100',
    };
}
//# sourceMappingURL=pnlService.js.map