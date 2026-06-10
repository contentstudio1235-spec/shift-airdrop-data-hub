// frontend/lib/format.ts
// Shared formatters for the Data Hub. Extracted from page.tsx for reuse.

export const fmtUSD = (n: number): string =>
  n >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(2)}B`
  : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(2)}`;

export const fmtWallet = (w: string, leftChars = 4, rightChars = 4): string =>
  !w ? '—' : w.length <= leftChars + rightChars + 3 ? w : `${w.slice(0, leftChars)}...${w.slice(-rightChars)}`;

export const fmtRelativeTime = (iso: string): string => {
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '—';
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
};
