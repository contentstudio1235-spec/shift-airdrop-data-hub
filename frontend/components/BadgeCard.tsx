import type { Badge, BadgeRarity } from '@/lib/types';

const RARITY_COLORS: Record<BadgeRarity, string> = {
  COMMON: '#9aa6b2',
  RARE: '#5da4ff',
  EPIC: '#9d6cf5',
  LEGENDARY: '#f7a23b',
};

const RARITY_BG: Record<BadgeRarity, string> = {
  COMMON: 'rgba(154,166,178,0.1)',
  RARE: 'rgba(93,164,255,0.1)',
  EPIC: 'rgba(157,108,245,0.1)',
  LEGENDARY: 'rgba(247,162,59,0.1)',
};

interface BadgeCardProps {
  badge: Badge;
}

export default function BadgeCard({ badge }: BadgeCardProps) {
  const rarityColor = RARITY_COLORS[badge.rarity];
  const rarityBg = RARITY_BG[badge.rarity];

  return (
    <div
      className={`badge-card${badge.earned ? ' earned' : ' locked'}`}
      title={badge.description}
    >
      {/* Rarity label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'var(--font-space)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: rarityColor,
            background: rarityBg,
            padding: '2px 6px',
            borderRadius: 999,
            border: `1px solid ${rarityColor}30`,
          }}
        >
          {badge.rarity}
        </span>
        {badge.earned && (
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--mint-soft)',
              border: '1px solid rgba(38,200,184,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>

      {/* Icon */}
      <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{badge.icon || '🏅'}</div>

      {/* Name */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-space)',
          color: 'var(--text)',
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {badge.name}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-mute)',
          lineHeight: 1.4,
          marginBottom: 10,
        }}
      >
        {badge.description}
      </div>

      {/* XP value */}
      {badge.xpValue > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mint)', fontFamily: 'var(--font-mono)' }}>
          +{badge.xpValue.toLocaleString()} XP
        </div>
      )}
    </div>
  );
}
