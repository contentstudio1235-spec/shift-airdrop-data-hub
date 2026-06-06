"use client";
import React from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';

/**
 * AnalyticsRedirectCard — Phase 2.1A replacement for the Engineering view's
 * legacy "Analytics" inner tab (the GA4 mirror page in page.tsx).
 *
 * Per the v2 audit plan Part VII (Hub vs adjacent tools), the GA4 mirror
 * surfaced 1-hour-stale cached data that GA4 native already shows
 * authoritatively. UX Researcher flagged this as a trust collision: when
 * the mirror disagrees with GA4, operators don't know which to trust.
 *
 * This card replaces it with:
 *   1. A primary CTA to open GA4 native (where the data lives).
 *   2. A pointer to the 3 things the Hub uniquely produces (and which
 *      GA4 cannot answer) — channel × on-chain holding, identity stitch,
 *      cohort retention.
 *
 * No data fetching — purely static.
 */

const ACCENT = '#00c896';
const ACCENT_DIM = 'rgba(0,200,150,0.15)';
const ACCENT_BORDER = 'rgba(0,200,150,0.2)';
const PANEL = 'rgba(8,18,14,0.9)';

const GA4_DASHBOARD_URL =
  'https://analytics.google.com/analytics/web/#/p536531221/reports/dashboard';

type BulletLink = { label: string; href: string };

const BULLET_LINKS: BulletLink[] = [
  { label: 'Channel × on-chain holding', href: '/admin/data-hub?view=attribution' },
  { label: 'Identity stitch (wallet ↔ Twitter ↔ Snag)', href: '/admin/data-hub?view=users' },
  { label: 'Cohort retention by signup week', href: '/admin/data-hub?view=cohorts' },
];

export function AnalyticsRedirectCard(): React.ReactElement {
  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${ACCENT_BORDER}`,
        borderRadius: 16,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        maxWidth: 720,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: ACCENT_DIM,
            border: `1px solid ${ACCENT_BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowSquareOut size={40} weight="regular" color={ACCENT} />
        </div>
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.25,
              marginBottom: 10,
            }}
          >
            GA4 data lives in GA4 native
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: '#7ab09a',
            }}
          >
            Session metrics, page views, channel attribution, and bounce rate
            are authoritative in GA4. The Hub doesn&rsquo;t re-present them
            because mirrors create trust collisions when they disagree with
            the source.
          </p>
        </div>
      </div>

      <a
        href={GA4_DASHBOARD_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 20px',
          background: `linear-gradient(135deg, ${ACCENT}, #00a876)`,
          color: '#021a10',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 13,
          alignSelf: 'flex-start',
          boxShadow: '0 4px 20px rgba(0,200,150,0.25)',
          textDecoration: 'none',
        }}
      >
        <ArrowSquareOut size={16} weight="regular" />
        Open GA4 dashboard
      </a>

      <div
        style={{
          borderTop: `1px solid ${ACCENT_BORDER}`,
          paddingTop: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <h3
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#3a7060',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          What the Hub uniquely produces
        </h3>
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {BULLET_LINKS.map(b => (
            <li
              key={b.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#c8e4d6',
              }}
            >
              <span style={{ color: ACCENT }} aria-hidden="true">
                &rarr;
              </span>
              <a
                href={b.href}
                style={{
                  color: ACCENT,
                  fontWeight: 600,
                  borderBottom: `1px solid ${ACCENT_BORDER}`,
                  textDecoration: 'none',
                }}
              >
                {b.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
