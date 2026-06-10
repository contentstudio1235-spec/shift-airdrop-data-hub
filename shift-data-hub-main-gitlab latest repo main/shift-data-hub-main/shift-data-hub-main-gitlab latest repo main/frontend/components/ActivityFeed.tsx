'use client';

import { useEffect, useState } from 'react';

interface ActivityEvent {
  id: number;
  wallet: string;
  eventType: string;
  eventData: Record<string, any>;
  createdAt: string;
  displayText: string;
}

interface Props {
  wallet?: string;
  global?: boolean;
  limit?: number;
}

export function ActivityFeed({ wallet, global = false, limit = 10 }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true);
      try {
        const url = global
          ? `/api/dashboard/activity/global?limit=${limit}`
          : `/api/dashboard/${wallet}/activity?limit=${limit}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('[ActivityFeed] Error:', error);
      }
      setLoading(false);
    }

    if (global || wallet) {
      fetchActivity();
    }
  }, [wallet, global, limit]);

  if (loading) {
    return <div className="activity-loading">Loading activity...</div>;
  }

  if (events.length === 0) {
    return <div className="activity-empty">No recent activity</div>;
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="activity-feed">
      <div className="activity-list">
        {events.map((event) => (
          <div key={event.id} className="activity-item">
            <div className="activity-content">
              <span className="activity-text">{event.displayText}</span>
              <span className="activity-time">{formatTime(event.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .activity-feed {
          background: #0f172a;
          border-radius: 12px;
          overflow: hidden;
        }

        .activity-loading,
        .activity-empty {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          max-height: 400px;
          overflow-y: auto;
        }

        .activity-list::-webkit-scrollbar {
          width: 6px;
        }

        .activity-list::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.2);
        }

        .activity-list::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
        }

        .activity-item {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);
          transition: background 0.2s;
        }

        .activity-item:hover {
          background: rgba(59, 130, 246, 0.05);
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .activity-text {
          color: #cbd5e1;
          font-size: 0.95em;
          flex: 1;
        }

        .activity-time {
          color: #64748b;
          font-size: 0.8em;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .activity-item {
            padding: 10px 12px;
          }

          .activity-text {
            font-size: 0.9em;
          }
        }
      `}</style>
    </div>
  );
}
