'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';

interface FAQItem {
  category: string;
  questions: Array<{
    q: string;
    a: string | React.ReactNode;
  }>;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'Referral System Basics',
    questions: [
      {
        q: 'How do I earn from referrals?',
        a: (
          <>
            When you refer someone using your code and they trade SHIFT tokens, you earn commission on their <strong>Position SP</strong> (not on Social or other SP types). Your commission rate ranges from <strong>10–15%</strong> based on their trading tier.
          </>
        ),
      },
      {
        q: 'What is the Final SP formula?',
        a: (
          <div style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: 8, marginTop: 8, fontSize: 12 }}>
            Final SP = (Position SP × 2.0) + (Social SP × 1.0) + (Referral SP × 1.0)
            <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 8 }}>
              • Position SP: weighted 2× (biggest driver)<br/>
              • Social SP: weighted 1× (SNAG quests, community tasks)<br/>
              • Referral SP: weighted 1× (10–15% commission from referred traders)
            </div>
          </div>
        ),
      },
      {
        q: 'How much can I earn from one referral per month?',
        a: (
          <>
            There's a <strong>monthly cap of 500 SP per referrer-referred pair</strong>. This means if a referred trader generates a lot of Position SP in one month, you can earn up to 500 SP from them that month (at your commission rate). The cap resets every month.
          </>
        ),
      },
    ],
  },
  {
    category: 'Commission Tiers',
    questions: [
      {
        q: 'What determines my commission rate?',
        a: (
          <div>
            Your commission rate is <strong>based on each referred trader's Position SP tier</strong>, not your own position:
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { range: '0 – 999 SP', rate: '10%', label: 'Starter' },
                { range: '1,000 – 9,999 SP', rate: '12%', label: 'Trader' },
                { range: '10,000+ SP', rate: '15%', label: 'Elite' },
              ].map((tier) => (
                <div key={tier.range} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, minWidth: 120 }}>{tier.label}</span>
                  <span style={{ color: 'var(--text-mute)', flex: 1 }}>{tier.range}</span>
                  <span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 14 }}>{tier.rate}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '10px', background: 'rgba(247,162,59,0.08)', borderRadius: 6, fontSize: 12, color: 'var(--text-dim)' }}>
              <Icon name="info" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              The higher your referred trader's tier, the more commission you earn from their position growth.
            </div>
          </div>
        ),
      },
      {
        q: 'Can I have multiple referral codes?',
        a: (
          <>
            You have one <strong>standard referral code</strong> (first 6 characters of your wallet in uppercase). If you're a KOL or have special status, you may have additional custom codes, but typically one primary code is used.
          </>
        ),
      },
      {
        q: 'Do referrals from different sources (SHIFT vs. Snag) count differently?',
        a: (
          <>
            <strong>No difference in commission.</strong> Whether someone joined via your SHIFT code or Snag link, you earn the same 10–15% commission on their Position SP once they're active. The source is just tracked for analytics.
          </>
        ),
      },
    ],
  },
  {
    category: 'Activation & Quality Gate',
    questions: [
      {
        q: 'What does "activation" mean?',
        a: (
          <>
            A referral becomes <strong>active when the referred wallet holds ≥$5 in SHIFT RWA assets.</strong> Only active referrals generate commission for you. This prevents farming and ensures quality trading engagement.
          </>
        ),
      },
      {
        q: 'Which SHIFT RWA assets count toward the $5 threshold?',
        a: (
          <div>
            Any of the 6 eligible SHIFT RWA token mints:
            <ul style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 0 20px' }}>
              <li>TSL2L, TSL1S (Treasury/S&P 500 Long/Short)</li>
              <li>SOX3L, SOX3S (Nasdaq Tech Long/Short)</li>
              <li>SPX3L, SPX3S (S&P 500 Long/Short)</li>
            </ul>
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(38,200,184,0.08)', borderRadius: 6, fontSize: 12 }}>
              Holding <strong>$5 combined</strong> across any of these assets counts toward activation.
            </div>
          </div>
        ),
      },
      {
        q: 'I have inactive referrals. How do I help them activate?',
        a: (
          <>
            Send them a nudge through the Referral Dashboard to encourage them to buy SHIFT RWA tokens. Once they hold ≥$5, you both benefit:
            <ul style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 0 20px' }}>
              <li><strong>They:</strong> Earn commission from their own referrals, start climbing the leaderboard</li>
              <li><strong>You:</strong> Start earning 10–15% commission on their Position SP growth</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    category: 'Legacy Balance & Claims',
    questions: [
      {
        q: 'What is "pending legacy balance"?',
        a: (
          <>
            SP earned from referrals made under the <strong>old system</strong> is tracked as "legacy balance." However, this balance only becomes <strong>claimable once those referred traders meet the $5 activation requirement</strong> (holding ≥$5 in SHIFT assets). This ensures legacy SP only rewards quality referrals.
          </>
        ),
      },
      {
        q: 'How do I claim my legacy balance?',
        a: (
          <>
            Once your referred trader(s) reach the $5 activation threshold, your legacy balance will appear in a card on your <Link href="/referral" style={{ color: 'var(--mint)', textDecoration: 'underline' }}>Referral Dashboard</Link>. Click "Claim" to add it to your SP balance. The claimed SP contributes to your Final SP calculation and leaderboard rank.
          </>
        ),
      },
      {
        q: 'When was the referral system update?',
        a: (
          <>
            The <strong>referral commission system v2</strong> went live with these changes:
            <ul style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 0 20px' }}>
              <li>Referral SP weighted ×1.0 (was ×0.5)</li>
              <li>10–15% tier-based commission rates</li>
              <li>$5 activation gate for quality filtering</li>
            </ul>
            All legacy referrals before this update remain visible. Their SP becomes claimable once the referred trader activates (≥$5 SHIFT holding).
          </>
        ),
      },
      {
        q: 'Do my legacy referrals need to activate to earn legacy balance?',
        a: (
          <>
            <strong>Yes.</strong> Legacy balance is <strong>conditional on activation</strong>. Here's how it works:
            <ol style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 0 20px' }}>
              <li>You referred someone under the old system → they generated legacy SP for you</li>
              <li>That legacy SP stays pending until they meet the activation requirement</li>
              <li>Once they hold ≥$5 in SHIFT RWA assets → legacy balance unlocks</li>
              <li>You can then claim it on your Referral Dashboard</li>
            </ol>
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(247,162,59,0.08)', borderRadius: 6, fontSize: 12 }}>
              This ensures legacy SP only rewards genuine, active referrals — not abandoned accounts.
            </div>
          </>
        ),
      },
    ],
  },
  {
    category: 'Referral SP in Final SP Calculation',
    questions: [
      {
        q: 'How much does Referral SP boost my Final SP?',
        a: (
          <>
            If you earn <strong>100 Referral SP</strong> from commissions, it contributes <strong>100 points</strong> to your Final SP (weighted at 1.0×).
            <div style={{ marginTop: 8, padding: '10px', background: 'rgba(247,162,59,0.08)', borderRadius: 6, fontSize: 12 }}>
              Example: If you have 2,000 Position SP, 500 Social SP, and 300 Referral SP:
              <br/>Final = (2,000 × 2) + (500 × 1) + (300 × 1) = <strong>5,300 Final SP</strong>
            </div>
          </>
        ),
      },
      {
        q: 'Does Referral SP help me rank higher on the leaderboard?',
        a: (
          <>
            <strong>Yes.</strong> Referral SP is weighted equally with Social SP in your Final SP total, which determines your leaderboard rank. More active referrals = higher Final SP = higher rank.
          </>
        ),
      },
      {
        q: 'What if I have no referrals yet?',
        a: (
          <>
            No problem. You still have Position SP (from trading) and Social SP (from SNAG quests). Referral SP is a bonus for those who invite others, not a requirement for competing on the leaderboard.
          </>
        ),
      },
    ],
  },
  {
    category: 'General Questions',
    questions: [
      {
        q: 'Can I refer myself?',
        a: 'No. The system prevents self-referrals. You can only earn from traders you genuinely refer.',
      },
      {
        q: 'What happens if a referral becomes inactive?',
        a: (
          <>
            If a referred trader drops below $5 in SHIFT holdings, they become inactive. <strong>You stop earning new commissions</strong> from them, but past commissions already earned stay in your balance. If they buy back in (≥$5), they're active again.
          </>
        ),
      },
      {
        q: 'Is there a referral leaderboard?',
        a: (
          <>
            Yes! Visit <Link href="/leaderboard" style={{ color: 'var(--mint)', textDecoration: 'underline' }}>Leaderboard</Link> and look for referral-focused sorting. You can rank by Final SP (which includes Referral SP), total referrals, referred volume, or referred holding value.
          </>
        ),
      },
      {
        q: 'How often is my commission updated?',
        a: (
          <>
            Commission calculations run <strong>every 30 minutes</strong> to reflect new Position SP from referred traders. Your Referral Dashboard updates in real-time once commissions are processed.
          </>
        ),
      },
      {
        q: 'Who do I contact for support?',
        a: (
          <>
            For referral questions or issues, check the <Link href="/register" style={{ color: 'var(--mint)', textDecoration: 'underline' }}>Register page</Link> help section or reach out to the SHIFT team via Discord or support email.
          </>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  const [openCategory, setOpenCategory] = useState<string | null>(FAQ_ITEMS[0].category);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  return (
    <div className="page fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Referral System FAQ</h1>
        <p style={{ fontSize: 15, color: 'var(--text-dim)', maxWidth: 600, lineHeight: 1.6 }}>
          Everything you need to know about earning commission from referrals, activation requirements, and how Referral SP fits into your Final SP calculation.
        </p>
      </div>

      {/* FAQ Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 20 }}>
        {FAQ_ITEMS.map((category) => (
          <div key={category.category} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            {/* Category Header */}
            <button
              onClick={() => setOpenCategory(openCategory === category.category ? null : category.category)}
              style={{
                width: '100%',
                padding: '16px',
                background: openCategory === category.category ? 'rgba(38,200,184,0.08)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (openCategory !== category.category) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (openCategory !== category.category) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textAlign: 'left', color: 'var(--text)' }}>
                {category.category}
              </h3>
              <Icon name={openCategory === category.category ? 'chevron-up' : 'chevron-down'} size={16} color="var(--text-mute)" />
            </button>

            {/* Questions */}
            {openCategory === category.category && (
              <div style={{ padding: 0 }}>
                {category.questions.map((item, idx) => (
                  <div key={idx} style={{ borderBottom: idx < category.questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <button
                      onClick={() => setOpenQuestion(openQuestion === `${category.category}-${idx}` ? null : `${category.category}-${idx}`)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 10,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'left', flex: 1, color: 'var(--text)' }}>
                        {item.q}
                      </span>
                      <Icon
                        name={openQuestion === `${category.category}-${idx}` ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="var(--text-mute)"
                        style={{ flexShrink: 0, marginTop: 2 }}
                      />
                    </button>

                    {/* Answer */}
                    {openQuestion === `${category.category}-${idx}` && (
                      <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 40,
          padding: '20px',
          background: 'linear-gradient(135deg,rgba(247,162,59,0.08),rgba(38,200,184,0.08))',
          border: '1px solid rgba(247,162,59,0.2)',
          borderRadius: 14,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
          Ready to start earning from referrals?
        </p>
        <Link href="/referral" className="btn mint" style={{ display: 'inline-flex', gap: 8 }}>
          <Icon name="refer" size={14} /> Go to Referral Dashboard
        </Link>
      </div>
    </div>
  );
}
