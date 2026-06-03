"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { Coins } from '@phosphor-icons/react';
import { Card } from '../primitives/Card';
import { BigNumber } from '../primitives/BigNumber';
import { fmtUSD } from '@/lib/format';

export function LifetimeStatsCard({ stats }: { stats?: { xp: number; volumeUSD: number; positions: number; badges: number } }) {
  return (
    <Card padding={20}>
      <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
        Lifetime Stats
      </div>
      {!stats || (stats.xp === 0 && stats.volumeUSD === 0 && stats.positions === 0 && stats.badges === 0) ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Coins size={20} weight="regular" color={TOKENS.textMuted} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TOKENS.textPrimary, opacity: 0.7 }}>No on-chain activity yet</div>
            <div style={{ fontSize: 11, color: TOKENS.textMuted }}>This profile has no positions, badges, or XP recorded.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>XP</div>
            <BigNumber value={stats.xp} formatter={n => n.toLocaleString()} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Lifetime Volume</div>
            <BigNumber value={stats.volumeUSD} formatter={fmtUSD} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Positions</div>
            <BigNumber value={stats.positions} formatter={n => n.toLocaleString()} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Badges</div>
            <BigNumber value={stats.badges} formatter={n => n.toLocaleString()} />
          </div>
        </div>
      )}
    </Card>
  );
}
