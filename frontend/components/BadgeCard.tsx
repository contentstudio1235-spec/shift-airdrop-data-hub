import Image from 'next/image';
import type { Badge, BadgeRarity } from '@/lib/types';

const RARITY_COLORS: Record<BadgeRarity, string> = {
  COMMON:    '#9aa6b2',
  RARE:      '#5da4ff',
  EPIC:      '#9d6cf5',
  LEGENDARY: '#f7a23b',
};

const RARITY_BG: Record<BadgeRarity, string> = {
  COMMON:    'rgba(154,166,178,0.1)',
  RARE:      'rgba(93,164,255,0.1)',
  EPIC:      'rgba(157,108,245,0.1)',
  LEGENDARY: 'rgba(247,162,59,0.1)',
};

const RARITY_GLOW: Record<BadgeRarity, string> = {
  COMMON:    'none',
  RARE:      '0 0 12px rgba(93,164,255,0.25)',
  EPIC:      '0 0 16px rgba(157,108,245,0.3)',
  LEGENDARY: '0 0 20px rgba(247,162,59,0.35)',
};

interface BadgeCardProps {
  badge: Badge;
}

/** Returns true when icon is a path like /badges/xxx.png */
const isImagePath = (icon?: string) => !!icon && icon.startsWith('/');

export default function BadgeCard({ badge }: BadgeCardProps) {
  const rarityColor = RARITY_COLORS[badge.rarity];
  const rarityBg    = RARITY_BG[badge.rarity];
  const rarityGlow  = RARITY_GLOW[badge.rarity];

  return (
    <div
      className={`badge-card${badge.earned ? ' earned' : ' locked'}`}
      title={badge.description}
      style={{ boxShadow: badge.earned ? rarityGlow : 'none' }}
    >
      {/* Rarity pill + check */}
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
              width: 18, height: 18,
              borderRadius: '50%',
              background: 'var(--mint-soft)',
              border: '1px solid rgba(38,200,184,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>

      {/* Icon — PNG if path, emoji otherwise */}
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
        {isImagePath(badge.icon) ? (
          <div
            style={{
              width: 56, height: 56,
              position: 'relative',
              opacity: badge.earned ? 1 : 0.35,
              filter: badge.earned ? 'none' : 'grayscale(100%)',
              transition: 'opacity 0.2s, filter 0.2s',
            }}
          >
            <Image
              src={badge.icon!}
              alt={badge.name}
              fill
              sizes="56px"
              style={{ objectFit: 'contain' }}
            />
          </div>
        ) : (
          <span
            style={{
              fontSize: 28,
              lineHeight: 1,
              opacity: badge.earned ? 1 : 0.35,
              filter: badge.earned ? 'none' : 'grayscale(100%)',
            }}
          >
            {badge.icon || '🏅'}
          </span>
        )}
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-space)',
          color: 'var(--text)',
          marginBottom: 4,
          lineHeight: 1.3,
          textAlign: 'center',
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
          textAlign: 'center',
        }}
      >
        {badge.description}
      </div>

      {/* XP value */}
      {badge.xpValue > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mint)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
          +{badge.xpValue.toLocaleString()} XP
        </div>
      )}
    </div>
  );
}
