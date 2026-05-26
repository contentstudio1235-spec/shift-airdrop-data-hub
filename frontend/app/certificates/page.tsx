'use client';

import Image from 'next/image';
import { CERTIFICATES, type CertificateCategory, type CertificateDefinition } from '@/lib/badges';

const CATEGORY_LABELS: Record<CertificateCategory, string> = {
  tier:        'Tier Certificates',
  mastery:     'Mastery Certificates',
  personality: 'Personality Certificates',
  seasonal:    'Seasonal Certificates',
};

const CATEGORY_ORDER: CertificateCategory[] = ['tier', 'mastery', 'personality', 'seasonal'];

const CATEGORY_COLORS: Record<CertificateCategory, string> = {
  tier:        '#f7a23b',
  mastery:     '#5da4ff',
  personality: '#9d6cf5',
  seasonal:    '#26C8B8',
};

function CertCard({ cert }: { cert: CertificateDefinition }) {
  const color = CATEGORY_COLORS[cert.category];
  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid rgba(${cert.category === 'tier' ? '247,162,59' : cert.category === 'mastery' ? '93,164,255' : cert.category === 'personality' ? '157,108,245' : '38,200,184'},0.2)`,
        borderRadius: 12,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.2)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ width: 72, height: 72, position: 'relative' }}>
        <Image src={cert.icon} alt={cert.name} fill sizes="72px" style={{ objectFit: 'contain' }} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-space)', textAlign: 'center' }}>
        {cert.name}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-mute)', textAlign: 'center', lineHeight: 1.4 }}>
        {cert.description}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color,
          background: `${color}18`, border: `1px solid ${color}30`,
          padding: '2px 7px', borderRadius: 999,
        }}>
          +{((cert.multiplierValue - 1) * 100).toFixed(0)}% {cert.multiplierType}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-mute)',
          background: 'var(--panel)', border: '1px solid var(--border)',
          padding: '2px 7px', borderRadius: 999,
          textTransform: 'capitalize',
        }}>
          {cert.category}
        </span>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const grouped = CATEGORY_ORDER.reduce<Record<CertificateCategory, CertificateDefinition[]>>(
    (acc, cat) => {
      acc[cat] = CERTIFICATES.filter(c => c.category === cat);
      return acc;
    },
    {} as Record<CertificateCategory, CertificateDefinition[]>
  );

  return (
    <div className="page fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'rgba(247,162,59,0.12)', border: '1px solid rgba(247,162,59,0.25)',
          borderRadius: 999, padding: '4px 12px',
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)',
          color: '#f7a23b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20,
        }}>
          Season 1 — Coming Soon
        </span>

        <h1 style={{
          fontSize: 44, fontWeight: 700, fontFamily: 'var(--font-space)',
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 12, lineHeight: 1.1,
        }}>
          SHIFT Certificates
        </h1>

        <p style={{ fontSize: 15, color: 'var(--text-dim)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          On-chain achievement NFTs minted to your wallet as proof of trading milestones, event participation,
          and Season 1 leaderboard performance. Certificates grant permanent or dynamic multiplier boosts.
        </p>

        {/* Stats strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 32 }}>
          {[
            { label: 'Total Certificates', value: CERTIFICATES.length },
            { label: 'Categories', value: CATEGORY_ORDER.length },
            { label: 'Max Boost', value: '+30%' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-space)', color: 'var(--mint)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate grid by category */}
      {CATEGORY_ORDER.map(cat => (
        <div key={cat} style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: CATEGORY_COLORS[cat] }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-space)', margin: 0 }}>
              {CATEGORY_LABELS[cat]}
            </h2>
            <span style={{
              fontSize: 11, color: CATEGORY_COLORS[cat],
              background: `${CATEGORY_COLORS[cat]}18`, border: `1px solid ${CATEGORY_COLORS[cat]}30`,
              padding: '1px 7px', borderRadius: 999, fontWeight: 600,
            }}>
              {grouped[cat].length}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {grouped[cat].map(cert => (
              <CertCard key={cert.id} cert={cert} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
