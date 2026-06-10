"use client";
import React, { useState } from 'react';
import { TOKENS, MOTION } from '@/lib/chartTokens';
import type { Icon } from '@phosphor-icons/react';
import { Wallet, ChartLineUp, Trophy, TwitterLogo, DiscordLogo, TelegramLogo, Plus, ArrowsMerge, Gear, DotsThree } from '@phosphor-icons/react';
import { Card } from '../primitives/Card';
import { fmtWallet, fmtRelativeTime } from '@/lib/format';
import type { ProfileWithLinks, IdentityLink } from '@/hooks/useUserProfile';
import { AddLinkDialog } from './AddLinkDialog';
import { MergeProfilesDialog } from './MergeProfilesDialog';
import { UnlinkDialog } from './UnlinkDialog';

const IDENTITY_ICONS: Record<string, Icon> = {
  wallet: Wallet,
  ga_client_id: ChartLineUp,
  snag_user_id: Trophy,
  social_x: TwitterLogo,
  social_discord: DiscordLogo,
  social_telegram: TelegramLogo,
};

const CONFIDENCE_STYLE: Record<string, { color: string; label: string }> = {
  deterministic: { color: TOKENS.threshold.green, label: 'det' },
  probabilistic: { color: TOKENS.threshold.yellow, label: 'prob' },
  manual:        { color: TOKENS.textSecondary,    label: 'man' },
};

function ActionButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: `1px solid ${TOKENS.accentBorder}`,
        color: TOKENS.accent,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 11,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex',
        gap: 5,
        alignItems: 'center',
        transition: `all ${MOTION.fast}`,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

export function IdentityCard({ profile, onMutated }: { profile: ProfileWithLinks; onMutated: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [unlinkLink, setUnlinkLink] = useState<IdentityLink | null>(null);
  const walletLinks = profile.links.filter(l => l.type === 'wallet');
  const canSetPrimary = walletLinks.length >= 2;

  return (
    <>
      <Card padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Identity
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <ActionButton onClick={() => setAddOpen(true)}>
              <Plus size={12} weight="bold" /> Add Link
            </ActionButton>
            <ActionButton onClick={() => setMergeOpen(true)}>
              <ArrowsMerge size={12} weight="bold" /> Merge
            </ActionButton>
            <ActionButton onClick={() => { /* placeholder for primary-wallet dropdown */ }} disabled={!canSetPrimary}>
              <Gear size={12} weight="bold" /> Primary
            </ActionButton>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['TYPE', 'VALUE', 'CONF', 'LINKED', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 800, color: TOKENS.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 8px 8px 0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profile.links.map(link => {
              const Icon = IDENTITY_ICONS[link.type] ?? Wallet;
              const conf = CONFIDENCE_STYLE[link.confidence] ?? CONFIDENCE_STYLE.manual;
              return (
                <tr key={link.linkId} style={{ borderTop: `1px solid ${TOKENS.chartGrid}` }}>
                  <td style={{ padding: '10px 8px 10px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={14} weight="regular" />
                      <span style={{ fontSize: 11, color: TOKENS.textMuted }}>{link.type}</span>
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: TOKENS.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                    {link.type === 'wallet' ? fmtWallet(link.value) : link.value}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: conf.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: conf.color }} />
                      {conf.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 11, color: TOKENS.textFaint }}>{fmtRelativeTime(link.linkedAt)}</td>
                  <td style={{ padding: '10px 0 10px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => setUnlinkLink(link)}
                      aria-label="Unlink identity"
                      style={{ background: 'transparent', border: 'none', color: TOKENS.textFaint, cursor: 'pointer', padding: 4 }}
                    >
                      <DotsThree size={16} weight="bold" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {addOpen && <AddLinkDialog profileId={profile.profileId} onClose={() => setAddOpen(false)} onSuccess={() => { setAddOpen(false); onMutated(); }} />}
      {mergeOpen && <MergeProfilesDialog winnerProfile={profile} onClose={() => setMergeOpen(false)} onSuccess={() => { setMergeOpen(false); onMutated(); }} />}
      {unlinkLink && <UnlinkDialog profileId={profile.profileId} link={unlinkLink} onClose={() => setUnlinkLink(null)} onSuccess={() => { setUnlinkLink(null); onMutated(); }} />}
    </>
  );
}
