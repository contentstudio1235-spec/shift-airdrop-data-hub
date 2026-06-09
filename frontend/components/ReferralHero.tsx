'use client';

import Icon from './Icon';

interface ReferralHeroProps {
  stats: {
    referralCount: number;
    totalVolume: number;
    totalHolding: number;
  };
}

export default function ReferralHero({ stats }: ReferralHeroProps) {
  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
    return n.toFixed(2);
  };

  const cards = [
    {
      icon: 'users',
      label: 'Referred Users',
      value: stats.referralCount.toString(),
      color: '#6B7DFF',
    },
    {
      icon: 'trending-up',
      label: 'Total Trading Volume',
      value: '$' + formatNumber(stats.totalVolume),
      color: '#00D084',
    },
    {
      icon: 'briefcase',
      label: 'Total Holdings',
      value: '$' + formatNumber(stats.totalHolding),
      color: '#FF9F43',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: card.color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={card.icon} size={16} color={card.color} />
            </div>
            <span style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: 500 }}>
              {card.label}
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
