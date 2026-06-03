"use client";
import React, { useState } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import { UserCircle, Copy, Check } from '@phosphor-icons/react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserTimeline } from '@/hooks/useUserTimeline';
import { fmtWallet, fmtRelativeTime } from '@/lib/format';
import { IdentityCard } from './IdentityCard';
import { SourceAttributionCard } from './SourceAttributionCard';
import { LifetimeStatsCard } from './LifetimeStatsCard';
import { TimelineCard } from './TimelineCard';
import { EmptyState } from '../primitives/EmptyState';

export interface UserDetailPaneProps {
  profileId: string | null;
  onProfileMutated?: () => void;
}

function HeaderStrip({ wallet, displayName, lastSeenAt }: { wallet: string; displayName: string | null; lastSeenAt: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };
  return (
    <div style={{
      padding: 24, borderBottom: `1px solid ${TOKENS.accentBorder}`,
      position: 'sticky', top: 0, background: 'rgba(8,18,14,0.95)', zIndex: 5,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
        Primary Wallet
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          onClick={() => setExpanded(e => !e)}
          style={{
            fontSize: 18, fontWeight: 800, color: TOKENS.textPrimary, letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums', cursor: 'pointer', transition: `color ${MOTION.fast}`,
          }}
        >
          {expanded ? wallet : fmtWallet(wallet, 12, 4)}
        </span>
        <button
          onClick={onCopy}
          aria-label="Copy wallet"
          style={{
            background: 'transparent', border: 'none', color: copied ? TOKENS.accent : TOKENS.textFaint,
            cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            transition: `color ${MOTION.fast}`,
          }}
        >
          {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="regular" />}
        </button>
      </div>
      <div style={{ fontSize: 12, color: TOKENS.textMuted, marginBottom: 4 }}>
        Display name: <span style={{ color: displayName ? TOKENS.textPrimary : TOKENS.textMuted }}>{displayName || '—'}</span>
      </div>
      <div style={{ fontSize: 11, color: TOKENS.textFaint }}>
        Last seen {fmtRelativeTime(lastSeenAt)}
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <>
      <style>{`@keyframes users-skeleton-shimmer { 0% { opacity: 0.3 } 50% { opacity: 0.5 } 100% { opacity: 0.3 } }`}</style>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          background: TOKENS.panel, border: `1px solid ${TOKENS.accentBorder}`,
          borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
          <div style={{ height: 12, width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 16, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 10, width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 8, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 10, width: '80%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 8, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
          <div style={{ height: 10, width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'users-skeleton-shimmer 1.6s ease-in-out infinite' }} />
        </div>
      ))}
    </>
  );
}

export function UserDetailPane({ profileId, onProfileMutated }: UserDetailPaneProps) {
  const profile = useUserProfile(profileId);
  const timeline = useUserTimeline(profileId);

  if (!profileId) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 12,
        background: TOKENS.panel, border: `1px solid ${TOKENS.accentBorder}`,
        borderRadius: 16, backdropFilter: 'blur(12px)',
      }}>
        <UserCircle size={48} color={TOKENS.textFaint} weight="regular" />
        <div style={{ fontSize: 18, fontWeight: 800, color: TOKENS.textPrimary, letterSpacing: '-0.02em' }}>Select a user</div>
        <div style={{ fontSize: 11, color: TOKENS.textMuted, maxWidth: 320, lineHeight: 1.5 }}>
          Pick a row from the list to inspect identity, attribution, and timeline.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: TOKENS.panel, border: `1px solid ${TOKENS.accentBorder}`,
      borderRadius: 16, backdropFilter: 'blur(12px)', overflowY: 'auto',
    }}>
      {profile.data && (
        <HeaderStrip
          wallet={profile.data.primaryWallet}
          displayName={profile.data.displayName}
          lastSeenAt={profile.data.lastSeenAt}
        />
      )}

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {profile.error ? (
          <EmptyState variant="stale" onRetry={profile.refetch} />
        ) : profile.loading && !profile.data ? (
          <SkeletonCards />
        ) : profile.data ? (
          <>
            <IdentityCard profile={profile.data} onMutated={() => { profile.refetch(); onProfileMutated?.(); }} />
            <SourceAttributionCard profile={profile.data} />
            <LifetimeStatsCard stats={profile.data.lifetimeStats} />
            <TimelineCard entries={timeline.entries} loading={timeline.loading} onLoadMore={timeline.loadMore} />
          </>
        ) : null}
      </div>
    </div>
  );
}
