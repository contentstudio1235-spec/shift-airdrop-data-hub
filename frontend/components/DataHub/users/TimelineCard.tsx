"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { Clock } from '@phosphor-icons/react';
import { Card } from '../primitives/Card';
import { TimelineEntry } from './TimelineEntry';
import type { TimelineEntry as Entry } from '@/hooks/useUserTimeline';

export function TimelineCard({ entries, loading, onLoadMore }: { entries: Entry[]; loading: boolean; onLoadMore: () => void }) {
  return (
    <Card padding={20}>
      <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
        Timeline
      </div>
      {entries.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
          <Clock size={20} weight="regular" color={TOKENS.textMuted} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TOKENS.textPrimary, opacity: 0.7 }}>No events recorded</div>
            <div style={{ fontSize: 11, color: TOKENS.textMuted }}>Identity events will appear here as they happen.</div>
          </div>
        </div>
      ) : (
        <>
          {entries.map(e => <TimelineEntry key={e.id} entry={e} />)}
          <button
            onClick={onLoadMore}
            disabled={loading}
            style={{
              width: '100%', padding: 10, marginTop: 12,
              background: 'transparent', border: `1px solid ${TOKENS.accentBorder}`,
              borderRadius: 8, color: TOKENS.accent, fontSize: 11, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Loading…' : 'Load older entries'}
          </button>
        </>
      )}
    </Card>
  );
}
