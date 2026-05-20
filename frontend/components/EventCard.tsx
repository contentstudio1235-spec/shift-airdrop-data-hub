'use client';

import { useEffect, useState } from 'react';
import type { ShiftEvent } from '@/lib/types';

const EVENT_ICONS: Record<string, string> = {
  twitter: '🚀',
  fomc: '🏛️',
  earnings: '📊',
  macro: '📈',
  ai: '🤖',
};

function formatCountdown(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface EventCardProps {
  event: ShiftEvent;
  onTrade?: () => void;
}

export default function EventCard({ event, onTrade }: EventCardProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(event.end_time));
  const icon = EVENT_ICONS[event.event_type] ?? '⚡';
  const isLive = event.is_active;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(event.end_time));
    }, 30000);
    return () => clearInterval(timer);
  }, [event.end_time]);

  return (
    <div className={`event-card${isLive ? ' live' : ''}`}>
      {/* Icon */}
      <div className="event-icon">{icon}</div>

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-space)',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {event.event_name}
          </span>
          {isLive && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 9,
                fontWeight: 700,
                fontFamily: 'var(--font-space)',
                color: 'var(--mint)',
                background: 'var(--mint-soft)',
                padding: '2px 6px',
                borderRadius: 999,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              <span
                style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mint)', animation: 'livePulse 2s ease infinite' }}
              />
              LIVE
            </span>
          )}
        </div>

        {/* Assets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          {event.eligible_assets.map((a) => (
            <span
              key={a}
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--mint)',
                background: 'var(--mint-soft)',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              {a}
            </span>
          ))}
        </div>

        {/* Badge reward */}
        <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>
          Badge: <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{event.badge_reward.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* CTA + countdown */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button
          className="btn sm mint"
          onClick={onTrade}
        >
          Trade
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>
          {countdown}
        </span>
      </div>
    </div>
  );
}
