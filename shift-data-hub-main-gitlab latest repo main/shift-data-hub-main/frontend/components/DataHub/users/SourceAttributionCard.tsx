"use client";
import React from 'react';
import { TOKENS } from '@/lib/chartTokens';
import { Lock, Warning } from '@phosphor-icons/react';
import { Card } from '../primitives/Card';
import { fmtRelativeTime } from '@/lib/format';
import type { ProfileWithLinks } from '@/hooks/useUserProfile';

function ColumnRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: TOKENS.textMuted }}>{label}</span>
      <span style={{ fontSize: 12, color: value ? TOKENS.textPrimary : TOKENS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export function SourceAttributionCard({ profile }: { profile: ProfileWithLinks }) {
  const isLegacy = profile.firstUtmSource === 'unknown_legacy';
  return (
    <Card padding={20}>
      <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
        Source Attribution
      </div>
      {isLegacy && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', background: 'rgba(255,154,60,0.08)',
          border: `1px solid rgba(255,154,60,0.3)`, borderRadius: 8,
          fontSize: 11, fontWeight: 600, color: TOKENS.threshold.yellow,
          marginBottom: 12,
        }}>
          <Warning size={14} weight="regular" />
          <span>Legacy user — pre-tracking acquisition. First-touch backfilled from referral_code.</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>First Touch</span>
            {profile.attributionLockedAt && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 6px', background: 'rgba(0,200,150,0.1)',
                border: `1px solid ${TOKENS.accentBorder}`, borderRadius: 4,
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: TOKENS.accent,
              }}>
                <Lock size={10} weight="fill" />
                LOCKED
              </span>
            )}
          </div>
          <ColumnRow label="source" value={profile.firstUtmSource} />
          <ColumnRow label="medium" value={profile.firstUtmMedium} />
          <ColumnRow label="campaign" value={profile.firstUtmCampaign} />
          {profile.attributionLockedAt && (
            <div style={{ fontSize: 11, color: TOKENS.textFaint, marginTop: 8 }}>
              locked {fmtRelativeTime(profile.attributionLockedAt)}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Last Touch
          </div>
          <ColumnRow label="source" value={profile.lastUtmSource} />
          <ColumnRow label="medium" value={profile.lastUtmMedium} />
          <ColumnRow label="campaign" value={profile.lastUtmCampaign} />
        </div>
      </div>
    </Card>
  );
}
