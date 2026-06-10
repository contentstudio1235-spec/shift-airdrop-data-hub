'use client';

import { useEffect, useState } from 'react';

interface Badge {
  badgeName: string;
  displayName: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legend';
  unlockRequirement: string;
  earned: boolean;
  earnedAt: string | null;
}

interface Props {
  wallet: string;
}

const rarityColors = {
  common: { bg: 'rgba(148, 163, 184, 0.1)', border: '#94a3b8', text: '#cbd5e1' },
  rare: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#93c5fd' },
  epic: { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', text: '#d8b4fe' },
  legend: { bg: 'rgba(251, 191, 36, 0.1)', border: '#fbbf24', text: '#fcd34d' },
};

export function BadgeGallery({ wallet }: Props) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [breakdown, setBreakdown] = useState({ common: 0, rare: 0, epic: 0, legend: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBadges() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/${wallet}/badges/gallery`);
        if (res.ok) {
          const data = await res.json();
          setBadges(data.badges || []);
          setBreakdown(data.breakdown || {});
        }
      } catch (error) {
        console.error('[BadgeGallery] Error:', error);
      }
      setLoading(false);
    }

    if (wallet) {
      fetchBadges();
    }
  }, [wallet]);

  if (loading) {
    return <div className="gallery-loading">Loading badges...</div>;
  }

  const filteredBadges = selectedRarity
    ? badges.filter(b => b.rarity === selectedRarity)
    : badges;

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  return (
    <div className="badge-gallery">
      <div className="gallery-header">
        <div className="header-stats">
          <span className="stat-badge">
            🏆 {earnedCount}/{totalCount}
          </span>
          <span className="header-title">Badge Gallery</span>
        </div>
      </div>

      {/* Rarity Filter */}
      <div className="rarity-filter">
        <button
          className={`filter-btn ${!selectedRarity ? 'active' : ''}`}
          onClick={() => setSelectedRarity(null)}
        >
          All ({badges.length})
        </button>
        {['common', 'rare', 'epic', 'legend'].map(rarity => {
          const count = breakdown[rarity as keyof typeof breakdown];
          return (
            <button
              key={rarity}
              className={`filter-btn ${selectedRarity === rarity ? 'active' : ''}`}
              onClick={() => setSelectedRarity(rarity)}
              style={{
                borderColor: rarityColors[rarity as keyof typeof rarityColors].border,
              }}
            >
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Badge Grid */}
      <div className="badge-grid">
        {filteredBadges.map(badge => {
          const colors = rarityColors[badge.rarity];
          return (
            <div
              key={badge.badgeName}
              className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
              style={{
                background: colors.bg,
                borderColor: colors.border,
              }}
            >
              <div className="badge-icon" style={{ fontSize: '2.5em' }}>
                {badge.earned ? badge.icon : '🔒'}
              </div>

              <div className="badge-info">
                <h3 className="badge-name" style={{ color: colors.text }}>
                  {badge.displayName}
                </h3>
                <p className="badge-description">{badge.description}</p>

                {!badge.earned && (
                  <p className="badge-requirement">
                    📋 {badge.unlockRequirement}
                  </p>
                )}

                {badge.earned && (
                  <p className="badge-earned">
                    ✓ Earned {new Date(badge.earnedAt!).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="badge-rarity" style={{ color: colors.text }}>
                {badge.rarity.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .badge-gallery {
          background: #0f172a;
          border-radius: 12px;
          padding: 16px;
        }

        .gallery-loading {
          padding: 32px;
          text-align: center;
          color: #94a3b8;
        }

        .gallery-header {
          margin-bottom: 20px;
        }

        .header-stats {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-badge {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          color: #000;
          font-size: 0.95em;
        }

        .header-title {
          font-size: 1.3em;
          font-weight: 600;
          color: #f1f5f9;
        }

        .rarity-filter {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 6px 12px;
          border: 1px solid #334155;
          border-radius: 6px;
          background: transparent;
          color: #cbd5e1;
          font-size: 0.85em;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .filter-btn.active {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
          color: #93c5fd;
        }

        .badge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .badge-card {
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          transition: all 0.3s;
          position: relative;
        }

        .badge-card.earned:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        .badge-card.locked {
          opacity: 0.7;
        }

        .badge-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badge-info {
          flex: 1;
        }

        .badge-name {
          margin: 0;
          font-size: 1em;
          font-weight: 600;
        }

        .badge-description {
          margin: 4px 0 0 0;
          font-size: 0.8em;
          color: #94a3b8;
          line-height: 1.3;
        }

        .badge-requirement {
          margin: 6px 0 0 0;
          font-size: 0.75em;
          color: #64748b;
          font-style: italic;
        }

        .badge-earned {
          margin: 6px 0 0 0;
          font-size: 0.75em;
          color: #10b981;
        }

        .badge-rarity {
          font-size: 0.7em;
          font-weight: 700;
          letter-spacing: 1px;
          position: absolute;
          top: 4px;
          right: 8px;
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .badge-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
          }

          .badge-card {
            padding: 12px;
          }

          .badge-icon {
            font-size: 2em;
          }
        }
      `}</style>
    </div>
  );
}
