// ============================================================
// P&L Badge Component — Display profit/loss styling
// ============================================================

interface PnLBadgeProps {
  pnlUsd: number | undefined;
  pnlPct: number | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable P&L badge showing dollar amount and percentage.
 * Colors: green for gains, red for losses, gray for break-even or N/A.
 */
export function PnLBadge({
  pnlUsd,
  pnlPct,
  size = 'md',
  className = '',
}: PnLBadgeProps) {
  // Handle missing data
  if (pnlUsd === undefined || pnlPct === undefined) {
    return (
      <div className={`bg-gray-100 text-gray-600 px-2 py-1 rounded font-semibold ${className}`}>
        ⚪ N/A
      </div>
    );
  }

  // Determine colors
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-600';
  let icon = '⚪';

  if (pnlUsd > 0) {
    bgColor = 'bg-emerald-100';
    textColor = 'text-emerald-700';
    icon = '🟢';
  } else if (pnlUsd < 0) {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
    icon = '🔴';
  }

  // Size-based styling
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const sign = pnlUsd >= 0 ? '+' : '';

  return (
    <div
      className={`
        ${bgColor} ${textColor} ${sizeClasses[size]}
        rounded-md font-semibold whitespace-nowrap
        ${className}
      `}
    >
      {icon} {sign}${Math.abs(pnlUsd).toFixed(2)} ({sign}
      {pnlPct.toFixed(2)}%)
    </div>
  );
}

/**
 * Inline P&L text (no badge styling).
 * Useful for dashboard summary or table cells.
 */
export function PnLText({
  pnlUsd,
  pnlPct,
  showIcon = true,
}: {
  pnlUsd: number | undefined;
  pnlPct: number | undefined;
  showIcon?: boolean;
}) {
  if (pnlUsd === undefined || pnlPct === undefined) {
    return <span className="text-gray-500">N/A</span>;
  }

  let textColor = 'text-gray-600';
  let icon = '⚪';

  if (pnlUsd > 0) {
    textColor = 'text-emerald-600';
    icon = '🟢';
  } else if (pnlUsd < 0) {
    textColor = 'text-red-600';
    icon = '🔴';
  }

  const sign = pnlUsd >= 0 ? '+' : '';

  return (
    <span className={`${textColor} font-semibold`}>
      {showIcon && `${icon} `}
      {sign}${Math.abs(pnlUsd).toFixed(2)} ({sign}
      {pnlPct.toFixed(2)}%)
    </span>
  );
}
