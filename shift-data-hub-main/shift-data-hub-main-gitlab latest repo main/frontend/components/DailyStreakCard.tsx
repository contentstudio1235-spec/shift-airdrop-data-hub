'use client';

import { useEffect, useState } from 'react';
import { fetchStreakInfo, processDailyCheckin } from '@/lib/api';
import type { StreakInfo } from '@/lib/gamification';
import { getMilestoneMessage, isMilestoneHit } from '@/lib/gamification';

interface Props {
  wallet: string;
  onCheckinComplete?: (xpAwarded: number, streak: number) => void;
}

export function DailyStreakCard({ wallet, onCheckinComplete }: Props) {
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!wallet) return;

    async function fetchStreak() {
      setLoading(true);
      const info = await fetchStreakInfo(wallet);
      setStreakInfo(info);

      // Check if already checked in today
      if (info?.lastCheckinDate) {
        const lastCheckin = new Date(info.lastCheckinDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setCheckedInToday(lastCheckin >= today);
      }

      setLoading(false);
    }

    fetchStreak();
  }, [wallet]);

  const handleCheckin = async () => {
    if (checkedInToday || !wallet) return;

    setLoading(true);
    const result = await processDailyCheckin(wallet);

    if (result) {
      setStreakInfo({
        currentStreak: result.streakCount,
        lastCheckinDate: new Date().toISOString(),
        daysUntilMilestone: 0,
      });

      setCheckedInToday(true);

      if (isMilestoneHit(result.streakCount)) {
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 3000);
      }

      onCheckinComplete?.(result.xpAwarded, result.streakCount);
    }

    setLoading(false);
  };

  if (loading || !streakInfo) {
    return <div className="streak-card">Loading streak...</div>;
  }

  const { currentStreak, daysUntilMilestone } = streakInfo;
  const milestoneMessage = getMilestoneMessage(currentStreak);

  return (
    <div className={`streak-card ${celebrating ? 'celebrating' : ''}`}>
      {celebrating && (
        <div className="celebration-overlay">
          <div className="confetti">🎉</div>
          <div className="confetti">🔥</div>
          <div className="confetti">⭐</div>
        </div>
      )}

      <div className="streak-header">
        <div className="streak-flame">
          🔥 {currentStreak}-Day Streak
        </div>
        <div className="streak-milestone">
          {milestoneMessage && (
            <span className="milestone-text">{milestoneMessage}</span>
          )}
        </div>
      </div>

      <div className="streak-body">
        <div className="streak-stat">
          <span className="streak-value">{currentStreak}</span>
          <span className="streak-label">Days</span>
        </div>

        <div className="streak-progress">
          {daysUntilMilestone > 0 && (
            <>
              <span className="next-milestone">{daysUntilMilestone} days to next milestone</span>
              <div className="milestone-dots">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="dot"
                    style={{
                      opacity: i < (currentStreak % 7) ? 1 : 0.2,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <button
        className={`checkin-button ${checkedInToday ? 'checked-in' : 'active'}`}
        onClick={handleCheckin}
        disabled={checkedInToday || loading}
      >
        {checkedInToday
          ? '✓ Checked in today'
          : loading
            ? 'Processing...'
            : 'Daily Check-in'}
      </button>

      <style jsx>{`
        .streak-card {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          border: 1px solid #10b981;
          border-radius: 12px;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }

        .streak-card.celebrating {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
        }

        .celebration-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .confetti {
          position: absolute;
          animation: float 2s ease-out forwards;
          font-size: 2em;
        }

        @keyframes float {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.5) rotate(360deg);
          }
        }

        .streak-header {
          margin-bottom: 12px;
        }

        .streak-flame {
          font-size: 1.2em;
          font-weight: 600;
          color: #10b981;
          margin-bottom: 8px;
        }

        .milestone-text {
          display: inline-block;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.85em;
          color: #6ee7b7;
        }

        .streak-body {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .streak-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .streak-value {
          font-size: 2em;
          font-weight: 700;
          color: #10b981;
        }

        .streak-label {
          font-size: 0.85em;
          color: #9ca3af;
        }

        .streak-progress {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .next-milestone {
          font-size: 0.85em;
          color: #cbd5e1;
        }

        .milestone-dots {
          display: flex;
          gap: 4px;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          transition: opacity 0.3s;
        }

        .checkin-button {
          width: 100%;
          padding: 10px 16px;
          border: 1px solid #10b981;
          border-radius: 8px;
          background: transparent;
          color: #10b981;
          font-weight: 600;
          font-size: 0.95em;
          cursor: pointer;
          transition: all 0.3s;
        }

        .checkin-button.active:hover {
          background: rgba(16, 185, 129, 0.1);
          transform: translateY(-2px);
        }

        .checkin-button.checked-in {
          background: rgba(16, 185, 129, 0.1);
          color: #6ee7b7;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .checkin-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
