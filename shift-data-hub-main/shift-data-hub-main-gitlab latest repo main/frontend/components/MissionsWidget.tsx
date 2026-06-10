'use client';

import { useEffect, useState } from 'react';
import { formatXp } from '@/lib/gamification';

interface Mission {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
  requirementType: string;
  requirementValue: number;
}

interface MissionProgress {
  missionId: string;
  missionName: string;
  progressValue: number;
  requirementValue: number;
  completed: boolean;
  completedAt: string | null;
  claimedReward: boolean;
  icon: string;
  xpReward: number;
}

interface Props {
  wallet: string;
}

export function MissionsWidget({ wallet }: Props) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<MissionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWeeklyXp, setTotalWeeklyXp] = useState(0);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMissions() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/${wallet}/missions`);
        if (res.ok) {
          const data = await res.json();
          setMissions(data.missions || []);
          setProgress(data.progress || []);
          setTotalWeeklyXp(data.totalWeeklyXp || 0);
        }
      } catch (error) {
        console.error('[Missions] Error:', error);
      }
      setLoading(false);
    }

    if (wallet) {
      fetchMissions();
    }
  }, [wallet]);

  const handleClaimReward = async (missionId: string) => {
    setClaiming(missionId);
    try {
      const res = await fetch(`/api/dashboard/${wallet}/missions/${missionId}/claim`, {
        method: 'POST',
      });

      if (res.ok) {
        // Refresh missions
        const missionsRes = await fetch(`/api/dashboard/${wallet}/missions`);
        if (missionsRes.ok) {
          const data = await missionsRes.json();
          setProgress(data.progress || []);
          setTotalWeeklyXp(data.totalWeeklyXp || 0);
        }
      }
    } catch (error) {
      console.error('[Missions] Error claiming reward:', error);
    }
    setClaiming(null);
  };

  if (loading) {
    return <div className="missions-loading">Loading missions...</div>;
  }

  if (missions.length === 0) {
    return <div className="missions-empty">No missions this week</div>;
  }

  const progressMap = new Map(progress.map(p => [p.missionId, p]));

  return (
    <div className="missions-widget">
      <div className="missions-header">
        <div className="header-content">
          <h2 className="missions-title">📋 This Week's Missions</h2>
          <span className="weekly-xp-badge">{formatXp(totalWeeklyXp)} XP Earned</span>
        </div>
      </div>

      <div className="missions-list">
        {missions.map(mission => {
          const missionProgress = progressMap.get(mission.id);
          const isCompleted = missionProgress?.completed || false;
          const isClaimedReward = missionProgress?.claimedReward || false;
          const progressPercent = missionProgress
            ? Math.min(100, (missionProgress.progressValue / mission.requirementValue) * 100)
            : 0;

          return (
            <div
              key={mission.id}
              className={`mission-card ${isCompleted ? 'completed' : ''} ${isClaimedReward ? 'claimed' : ''}`}
            >
              <div className="mission-icon">{mission.icon}</div>

              <div className="mission-details">
                <h3 className="mission-name">{mission.name}</h3>
                <p className="mission-description">{mission.description}</p>

                <div className="progress-section">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {missionProgress
                      ? `${Math.round(missionProgress.progressValue)}/${Math.round(mission.requirementValue)}`
                      : `0/${Math.round(mission.requirementValue)}`}
                  </span>
                </div>
              </div>

              <div className="mission-reward">
                <span className="reward-xp">{mission.xpReward} XP</span>

                {isClaimedReward ? (
                  <button className="claim-btn claimed" disabled>
                    ✓ Claimed
                  </button>
                ) : isCompleted ? (
                  <button
                    className="claim-btn claimable"
                    onClick={() => handleClaimReward(mission.id)}
                    disabled={claiming === mission.id}
                  >
                    {claiming === mission.id ? 'Claiming...' : 'Claim'}
                  </button>
                ) : (
                  <button className="claim-btn disabled" disabled>
                    {Math.round(progressPercent)}%
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .missions-widget {
          background: #0f172a;
          border-radius: 12px;
          padding: 16px;
        }

        .missions-loading,
        .missions-empty {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
        }

        .missions-header {
          margin-bottom: 16px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .missions-title {
          margin: 0;
          font-size: 1.2em;
          color: #f1f5f9;
        }

        .weekly-xp-badge {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          color: #fff;
          font-size: 0.9em;
        }

        .missions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mission-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid #334155;
          border-radius: 10px;
          align-items: stretch;
          transition: all 0.2s;
        }

        .mission-card:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: #475569;
        }

        .mission-card.completed {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .mission-card.claimed {
          opacity: 0.6;
        }

        .mission-icon {
          font-size: 2em;
          min-width: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mission-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mission-name {
          margin: 0;
          font-size: 0.95em;
          font-weight: 600;
          color: #f1f5f9;
        }

        .mission-description {
          margin: 0;
          font-size: 0.8em;
          color: #cbd5e1;
        }

        .progress-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar-container {
          flex: 1;
          height: 6px;
          background: rgba(51, 65, 85, 0.5);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 0.75em;
          color: #94a3b8;
          white-space: nowrap;
          min-width: 60px;
        }

        .mission-reward {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 70px;
        }

        .reward-xp {
          font-weight: 700;
          color: #fbbf24;
          font-size: 0.95em;
        }

        .claim-btn {
          padding: 4px 8px;
          border-radius: 4px;
          border: none;
          font-size: 0.8em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .claim-btn.claimable {
          background: linear-gradient(135deg, #10b981, #34d399);
          color: #000;
        }

        .claim-btn.claimable:hover {
          transform: scale(1.05);
        }

        .claim-btn.claimed {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
          cursor: not-allowed;
        }

        .claim-btn.disabled {
          background: rgba(51, 65, 85, 0.3);
          color: #64748b;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .mission-card {
            flex-direction: column;
          }

          .mission-reward {
            flex-direction: row;
            justify-content: space-between;
            width: 100%;
          }

          .reward-xp {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}
