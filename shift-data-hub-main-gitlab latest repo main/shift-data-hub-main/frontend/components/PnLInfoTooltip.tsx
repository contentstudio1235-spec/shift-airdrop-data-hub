// ============================================================
// P&L Info Tooltip — Explains update frequency & accuracy
// ============================================================

import { useState } from 'react';
import Icon from './Icon';

interface PnLInfoTooltipProps {
  variant?: 'dashboard' | 'position' | 'inline';
  showIcon?: boolean;
}

/**
 * Tooltip explaining P&L refresh frequency and data accuracy.
 * Prevents user confusion about real-time vs. cached prices.
 */
export function PnLInfoTooltip({
  variant = 'dashboard',
  showIcon = true,
}: PnLInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const messages = {
    dashboard: {
      title: 'Portfolio P&L',
      accuracy:
        'P&L is calculated using cached prices updated every 5 minutes. Dashboard auto-refreshes every 60 seconds.',
      details: [
        '💰 Prices: Cached for 5 minutes (1 API call max per asset)',
        '🔄 Dashboard: Auto-refreshes every 60 seconds',
        '⏱️ Manual refresh: Click "Refresh" button for instant update',
        '📊 RWA tokens: Use fallback prices (updated monthly)',
        '✅ Entry prices: Extracted from blockchain (100% accurate)',
      ],
    },
    position: {
      title: 'Position P&L',
      accuracy:
        'Each position shows unrealized P&L based on cached prices. Real-time prices available via Jupiter or manual refresh.',
      details: [
        '📈 Unrealized P&L: (current price - entry price) × amount',
        '🔗 Entry price: Extracted from your swap transaction (blockchain)',
        '💾 Current price: Cached max 5 min, fetched from Jupiter',
        '🟢 Gains: Green if profit, 🔴 Red if loss',
        '⚙️ Manual refresh: Updates all prices immediately',
      ],
    },
    inline: {
      title: 'P&L Information',
      accuracy:
        'Prices cached for 5 minutes. Click refresh for latest data.',
      details: [
        'Updated every 5 min via Jupiter API',
        'Manual refresh available anytime',
        'Blockchain entry prices are permanent',
      ],
    },
  };

  const config = messages[variant];

  const tooltipPosition =
    variant === 'dashboard'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : 'bottom-full right-0 mb-2';

  return (
    <div className="relative inline-block">
      {/* Info Icon */}
      {showIcon && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center ml-1 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-800 transition-colors"
          title={config.title}
          aria-label={config.title}
        >
          <Icon name="info" size={12} />
        </button>
      )}

      {/* Tooltip */}
      {isOpen && (
        <div
          className={`absolute ${tooltipPosition} z-50 w-80 bg-slate-900 text-white rounded-lg shadow-xl p-4 text-sm`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">{config.title}</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Accuracy Statement */}
          <div className="bg-slate-800 border-l-2 border-amber-500 rounded px-3 py-2 mb-3">
            <p className="text-xs text-amber-100">{config.accuracy}</p>
          </div>

          {/* Details List */}
          <ul className="space-y-2">
            {config.details.map((detail, i) => (
              <li key={i} className="text-xs text-slate-300 flex gap-2">
                <span className="flex-shrink-0">{detail.split(':')[0]}</span>
                <span className="text-slate-400">
                  {detail.includes(':') ? detail.split(':')[1] : detail}
                </span>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
            <p>💡 For real-time prices, click the Refresh button</p>
          </div>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 transform rotate-45" />
        </div>
      )}

      {/* Click-to-close overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Inline info text (no icon, just text explanation).
 * Use this in modals or detailed explanation sections.
 */
export function PnLInfoText() {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
      <div className="flex gap-3">
        <Icon name="info" size={20} className="text-blue-500 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-2">How P&L Updates</p>
          <ul className="space-y-1 text-xs">
            <li>
              <strong>Prices cached 5 minutes:</strong> Jupiter API called once per
              refresh window
            </li>
            <li>
              <strong>Dashboard auto-refresh:</strong> Every 60 seconds while page is
              open
            </li>
            <li>
              <strong>Manual refresh:</strong> Click button for instant price update
            </li>
            <li>
              <strong>Entry prices:</strong> Extracted from blockchain (always
              accurate)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
