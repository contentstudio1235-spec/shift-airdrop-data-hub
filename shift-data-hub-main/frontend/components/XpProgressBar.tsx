'use client';

import { useEffect, useState } from 'react';
import { fetchUserLevel } from '@/lib/api';
import type { LevelInfo } from '@/lib/gamification';
import { formatXp } from '@/lib/gamification';

interface Props {
  wallet: string;
  totalXp: number;
}

export function XpProgressBar({ wallet, totalXp }: Props) {
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) return;

    async function fetchLevel() {
      setLoading(true);
      const info = await fetchUserLevel(wallet);
      setLevelInfo(info);
      setLoading(false);
    }

    fetchLevel();
  }, [wallet, totalXp]);

  if (loading || !levelInfo) {
    return (
      <div className="level-card">
        <div className="level-header">
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const { currentLevel, progressPercent, xpToNextLevel, nextLevelName } = levelInfo;

  return (
    <div className="level-card">
      {/* Level Header */}
      <div className="level-header">
        <div className="level-badge">
          <span className="level-icon" style={{ fontSize: '2em' }}>
            {currentLevel.icon}
          </span>
          <div className="level-info">
            <span className="level-name" style={{ color: currentLevel.color }}>
              {currentLevel.name}
            </span>
            <span className="level-number">Level {currentLevel.level}</span>
          </div>
        </div>
        <span className="level-xp" style={{ color: currentLevel.color }}>
          {formatXp(Math.round(totalXp))} XP
        </span>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: currentLevel.color,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Progress Text */}
        <div className="progress-text">
          {currentLevel.level < 5 ? (
            <>
              <span>{formatXp(xpToNextLevel)} XP to {nextLevelName}</span>
              <span className="progress-percent">{progressPercent}%</span>
            </>
          ) : (
            <span className="max-level">Maximum Level Reached! 👑</span>
          )}
        </div>
      </div>

      <style jsx>{`
        .level-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .level-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .level-badge {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .level-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .level-info {
          display: flex;
          flex-direction: column;
        }

        .level-name {
          font-weight: 600;
          font-size: 1.1em;
        }

        .level-number {
          color: #94a3b8;
          font-size: 0.9em;
        }

        .level-xp {
          font-weight: 600;
          font-size: 1.2em;
        }

        .progress-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          box-shadow: 0 0 10px currentColor;
        }

        .progress-text {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85em;
          color: #cbd5e1;
        }

        .progress-percent {
          font-weight: 600;
          color: #94a3b8;
        }

        .max-level {
          width: 100%;
          text-align: center;
          font-size: 0.95em;
          font-weight: 600;
          color: #fbbf24;
        }

        @media (max-width: 640px) {
          .level-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .level-badge {
            width: 100%;
          }

          .level-xp {
            font-size: 1em;
          }
        }
      `}</style>
    </div>
  );
}
