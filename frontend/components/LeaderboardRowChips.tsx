'use client';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  score: number;
  referredCount: number;
  referredVolume: number;
  referredHolding: number;
}

interface LeaderboardRowChipsProps {
  entry: LeaderboardEntry;
}

export default function LeaderboardRowChips({ entry }: LeaderboardRowChipsProps) {
  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
    return n.toFixed(0);
  };

  const chips = [
    { label: 'Referrals', value: entry.referredCount, color: '#6B7DFF' },
    { label: 'Volume', value: '$' + formatNumber(entry.referredVolume), color: '#00D084' },
    { label: 'Holding', value: '$' + formatNumber(entry.referredHolding), color: '#FF9F43' },
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
