'use client';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score?: number;
  totalSp?: number;
  referredCount?: number;
  preRegCount?: number;
  season1Count?: number;
  referredVolume?: number;
  referredHolding?: number;
}

interface LeaderboardRowChipsProps {
  entry: LeaderboardEntry;
}

export default function LeaderboardRowChips({ entry }: LeaderboardRowChipsProps) {
  const formatNumber = (n: number | null | undefined) => {
    const v = Number(n ?? 0);
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(2) + 'K';
    return v.toFixed(0);
  };

  const hasReferralData = (entry.referredCount ?? 0) > 0 || (entry.preRegCount ?? 0) > 0 || (entry.season1Count ?? 0) > 0;

  const chips = [
    {
      label: 'Referrals',
      value: entry.referredCount ?? '—',
      color: '#6B7DFF',
    },
    {
      label: 'Season 1',
      value: hasReferralData
        ? (entry.season1Count != null ? entry.season1Count : (entry.preRegCount != null ? (entry.referredCount ?? 0) - (entry.preRegCount ?? 0) : '—'))
        : '—',
      color: '#26C8B8',
    },
    {
      label: 'Pre-Reg',
      value: hasReferralData && entry.preRegCount != null ? entry.preRegCount : '—',
      color: '#94A3B8',
    },
  ];

  return (
    <>
      {chips.map((chip) => (
        <td
          key={chip.label}
          style={{
            padding: '12px',
            textAlign: 'right',
            fontSize: '11px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              background: chip.color + '15',
              color: chip.color,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {chip.label}: {chip.value}
          </span>
        </td>
      ))}
    </>
  );
}
