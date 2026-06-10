"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type {
  HubData,
  HubPage,
  AdminDashboard,
  OnchainHolders,
  AnalyticsDashboard,
  Leaderboard,
  GA4Data,
  AggregatedKPIs,
  FunnelTab,
} from "@/components/DataHub/types";
import { LayoutShell, isValidTopView, type TopView } from './layout-shell';
import { FunnelsView } from './views/FunnelsView';
import { AttributionView } from './views/AttributionView';
import { CohortsView } from './views/CohortsView';
import { RawDataView } from './views/RawDataView';
import { UsersView } from '@/components/DataHub/users/UsersView';
import { PulseView } from '@/components/DataHub/pulse/PulseView';
import { UtmGovernancePanel } from '@/components/DataHub/engineering/UtmGovernancePanel';
import { AnalyticsRedirectCard } from '@/components/DataHub/engineering/AnalyticsRedirectCard';
import { Tag } from '@phosphor-icons/react';
import { HubSessionProvider, useHubSession } from '@/hooks/useHubSession';
import { useSyncTopViewFromUrl } from '@/hooks/useTopViewFromUrl';
import { FlagAffordanceStyles } from '@/components/DataHub/primitives/FlagButton';

const API = process.env.NEXT_PUBLIC_API_URL || "https://shift-airdrop-backend.onrender.com";
const KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "ShiftRwa2026@@$$Key";
const H: Record<string, string> = { "x-admin-key": KEY, "Content-Type": "application/json" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, dec = 0) =>
  n >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(2)}B`
  : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? n.toLocaleString(undefined, { maximumFractionDigits: dec })
  : n.toFixed(dec);

const fmtUSD = (n: number) =>
  n >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(2)}B`
  : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(2)}`;

const fmtWallet = (w: string) => w ? `${w.slice(0, 4)}...${w.slice(-4)}` : "—";
const accent = "#00c896";
const accentDim = "rgba(0,200,150,0.15)";
const accentBorder = "rgba(0,200,150,0.2)";
const panel = "rgba(8,18,14,0.9)";
const bg = "#030d0a";

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  card: {
    background: panel,
    border: `1px solid ${accentBorder}`,
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    overflow: "hidden" as const,
  },
  label: { fontSize: "10px", fontWeight: 700, color: "#3a7060", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "4px" },
  value: { fontSize: "28px", fontWeight: 800, color: "#fff", lineHeight: 1.1 },
  subval: { fontSize: "13px", color: "#5a9070", marginTop: "4px" },
  badge: (c = accent) => ({
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: `${c}20`, color: c, border: `1px solid ${c}40`,
    borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700,
  }),
  pill: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: accentDim, color: accent, border: `1px solid ${accentBorder}`,
    borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: 600,
  },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  divider: { height: "1px", background: accentBorder, margin: "16px 0" },
};

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const { login } = useAdminAuth();
  const attempt = () => { const ok = login(pass); if (ok) onAuth(); else setErr(true); };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <div style={{ background: "rgba(10,22,16,0.95)", border: `1px solid ${accentBorder}`, borderRadius: "20px", padding: "52px 44px", width: "100%", maxWidth: "420px", boxShadow: `0 0 80px rgba(0,200,150,0.1)` }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: accentDim, border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "24px" }}>📊</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "20px" }}>SHIFT RWA</div>
          <div style={{ color: "#3a7060", fontSize: "13px", marginTop: "4px" }}>Omnichannel Data Hub</div>
        </div>
        <input type="password" placeholder="Admin passcode" value={pass} autoFocus
          onChange={e => { setPass(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.4)", border: `1px solid ${err ? "#ff6b6b" : "rgba(255,255,255,0.08)"}`, borderRadius: "12px", padding: "14px 16px", color: "#fff", fontSize: "14px", outline: "none", marginBottom: "14px", fontFamily: "inherit" }} />
        {err && <p style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "12px" }}>Incorrect passcode</p>}
        <button onClick={attempt} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${accent}, #00a876)`, color: "#021a10", border: "none", borderRadius: "12px", fontWeight: 800, fontSize: "15px", cursor: "pointer", boxShadow: `0 4px 24px rgba(0,200,150,0.35)`, fontFamily: "inherit" }}>
          Unlock Hub
        </button>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ title, subtitle, action, children, noPad }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: `1px solid ${accentBorder}`, flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={S.label}>{title}</div>
          {subtitle && <div style={{ fontSize: "11px", color: "#3a7060", marginTop: "1px" }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={noPad ? {} : { padding: "20px 22px" }}>{children}</div>
    </div>
  );
}

// ─── Stat Cell ────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, accent: ac, icon }: { label: string; value: string | number; sub?: string; accent?: string; icon?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={S.label}>{icon && <span style={{ marginRight: "4px" }}>{icon}</span>}{label}</div>
      <div style={{ ...S.value, color: ac || "#fff", fontSize: "24px" }}>{value}</div>
      {sub && <div style={S.subval}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = "100%" }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, background: "rgba(255,255,255,0.04)", borderRadius: "6px", animation: "pulse 1.5s ease-in-out infinite" }} />;
}

// ─── Funnel Bar ───────────────────────────────────────────────────────────────
function FunnelBar({ steps }: { steps: Array<{ name: string; count: number }> }) {
  const max = steps[0]?.count || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {steps.map((s, i) => {
        const pct = Math.round((s.count / max) * 100);
        const w = Math.max(pct, 8);
        return (
          <div key={i}>
            <div style={{ ...S.row, marginBottom: "5px" }}>
              <span style={{ fontSize: "11px", color: "#5a9070", fontWeight: 600 }}>{s.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#fff", fontWeight: 700 }}>{s.count.toLocaleString()}</span>
                {i > 0 && <span style={S.badge()}>{pct}%</span>}
              </div>
            </div>
            <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${w}%`, background: `linear-gradient(90deg, ${accent}, #00a876)`, borderRadius: "3px", boxShadow: `0 0 8px rgba(0,200,150,0.5)`, transition: "width 0.6s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
function MiniLine({ data, color = accent, height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

// ─── Channel Donut ────────────────────────────────────────────────────────────
const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "#00c896", "Direct": "#3b82f6", "Referral": "#8b5cf6",
  "Organic Social": "#f59e0b", "Email": "#ec4899", "Paid Search": "#f97316",
  "(Other)": "#6b7280", "Unassigned": "#374151",
};

// ─── Progress Ring ────────────────────────────────────────────────────────────
function Ring({ value, max, label, color = accent }: { value: number; max: number; label: string; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg width={70} height={70} viewBox="0 0 70 70">
        <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
        <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 35 35)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
        <text x={35} y={35} dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>{Math.round(pct)}%</text>
      </svg>
      <div style={{ fontSize: "10px", color: "#5a9070", textAlign: "center", maxWidth: "70px" }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── OVERVIEW PAGE ────────────────────────────────────────────────────────────
function OverviewPage({ data }: { data: HubData }) {
  const { admin, onchain, analytics, leaderboard, kpis } = data;
  const m = admin?.metrics;
  const a = analytics?.metrics;

  const kpiCards = [
    { label: "Total AUM Holders", value: onchain?.uniqueHolders?.toLocaleString() || "—", sub: `${onchain?.totalHolderSlots || 0} total slots`, icon: "🏦", accent: "#00c896" },
    // Trading Volume is the lifetime SUM(position_size_usd) FROM positions (no WHERE — includes closed positions).
    // activeHolders is the count of users with any open position (not the count of open positions themselves).
    { label: "Trading Volume (Lifetime)", value: a ? fmtUSD(a.totalVolume) : "—", sub: `${a?.activeHolders || 0} active holders`, icon: "📈", accent: "#3b82f6" },
    { label: "Registered Users (All-time)", value: m?.total_users?.toLocaleString() || "—", sub: `${a?.stitchedUsers || 0} identity stitched`, icon: "👛", accent: "#8b5cf6" },
    { label: "Total SHIFT Points (Lifetime)", value: m?.total_xp ? `${(m.total_xp / 1_000_000).toFixed(2)}M` : "—", sub: `${m?.badge_count || 0} badges awarded`, icon: "⚡", accent: "#f59e0b" },
    { label: "Avg Multiplier", value: m?.avg_multiplier ? `${m.avg_multiplier.toFixed(3)}x` : "—", sub: "Across all active wallets", icon: "✖️", accent: "#ec4899" },
    { label: "On-Chain Tokens", value: onchain?.tokens?.length?.toString() || "6", sub: "Live SHIFT Series tokens", icon: "🔗", accent: "#00c896" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
        {kpiCards.map((k, i) => (
          <div key={i} style={{ ...S.card, padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ fontSize: "22px" }}>{k.icon}</div>
              <div style={{ ...S.badge(k.accent), fontSize: "10px" }}>LIVE</div>
            </div>
            <div style={S.label}>{k.label}</div>
            <div style={{ ...S.value, color: k.accent, fontSize: "26px" }}>{k.value}</div>
            <div style={S.subval}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column: AUM Funnel + Top Leaderboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card title="RWA Acquisition Funnel" subtitle="Full journey: register → hold">
          {analytics?.funnels?.aum ? (
            <FunnelBar steps={analytics.funnels.aum} />
          ) : <Skeleton h={160} />}
        </Card>

        <Card title="Top Performers" subtitle="By SHIFT Points this cycle">
          {leaderboard?.entries ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {leaderboard.entries.slice(0, 6).map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "8px", background: i < 3 ? accentDim : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: i < 3 ? accent : "#5a9070", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontFamily: "monospace", fontSize: "11px", color: "#7ab09a" }}>{fmtWallet(e.wallet)}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{(e.totalSp || 0).toLocaleString()} SP</div>
                  <div style={S.badge()}>{(e.claimMultiplier || 1).toFixed(1)}x</div>
                </div>
              ))}
            </div>
          ) : <Skeleton h={200} />}
        </Card>
      </div>

      {/* On-chain tokens row */}
      <Card title="Live On-Chain Token Holdings" subtitle="All 6 SHIFT Series Tokens · Solana mainnet">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
          {onchain?.tokens ? onchain.tokens.map((t) => {
            const isLong = t.symbol.endsWith("L");
            const c = isLong ? accent : "#f87171";
            const pct = Math.round((t.holders / (onchain.uniqueHolders || 1)) * 100);
            return (
              <div key={t.symbol} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${c}20`, borderRadius: "12px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ fontWeight: 800, fontSize: "13px", color: "#fff" }}>{t.symbol}</div>
                  <div style={S.badge(c)}>{isLong ? "LONG" : "SHORT"}</div>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: c, marginBottom: "4px" }}>{t.holders}</div>
                <div style={{ fontSize: "10px", color: "#5a9070" }}>{t.name}</div>
                <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "8px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: "2px" }} />
                </div>
              </div>
            );
          }) : [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} h={100} />)}
        </div>
      </Card>
    </div>
  );
}

// ─── MARKETS PAGE ─────────────────────────────────────────────────────────────
function MarketsPage({ data }: { data: HubData }) {
  const { onchain, analytics, leaderboard } = data;
  const m = analytics?.metrics;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* AUM Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        {[
          { label: "Unique Holders", value: onchain?.uniqueHolders?.toLocaleString() || "—", icon: "🏦" },
          { label: "Total Holder Slots", value: onchain?.totalHolderSlots?.toLocaleString() || "—", icon: "🪙" },
          // Same lifetime SUM(position_size_usd) semantic as the Overview page
          // card — the ef104ef commit disambiguated Overview but missed Markets.
          // Mirror the (Lifetime) qualifier + holders-not-positions correction.
          { label: "Trading Volume (Lifetime)", value: m ? fmtUSD(m.totalVolume) : "—", icon: "📊" },
          { label: "Active Holders", value: m?.activeHolders?.toLocaleString() || "—", icon: "🔓" },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card, padding: "20px" }}>
            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{k.icon}</div>
            <div style={S.label}>{k.label}</div>
            <div style={{ ...S.value, color: accent }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Token Performance Matrix */}
      <Card title="Token Performance Matrix" subtitle="All 6 SHIFT Series Tokens — live on-chain data">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${accentBorder}` }}>
              {["Token", "Type", "Holders", "Market Share", "Mint"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#3a7060", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {onchain?.tokens ? onchain.tokens.sort((a, b) => b.holders - a.holders).map((t, i) => {
              const isLong = t.symbol.endsWith("L");
              const c = isLong ? accent : "#f87171";
              const share = ((t.holders / (onchain.totalHolderSlots || 1)) * 100).toFixed(1);
              return (
                <tr key={t.symbol} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,200,150,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}>
                  <td style={{ padding: "12px", fontWeight: 800, color: "#fff" }}>{t.symbol}</td>
                  <td style={{ padding: "12px" }}><span style={S.badge(c)}>{isLong ? "↑ LONG" : "↓ SHORT"}</span></td>
                  <td style={{ padding: "12px", color: c, fontWeight: 700 }}>{t.holders}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", minWidth: "60px" }}>
                        <div style={{ height: "100%", width: `${share}%`, background: c, borderRadius: "2px" }} />
                      </div>
                      <span style={{ fontSize: "11px", color: "#5a9070", width: "35px" }}>{share}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "11px", color: "#5a9070" }}>{fmtWallet(t.mint)}</td>
                </tr>
              );
            }) : <tr><td colSpan={5}><Skeleton h={200} /></td></tr>}
          </tbody>
        </table>
      </Card>

      {/* Long vs Short ratio */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card title="Long / Short Sentiment" subtitle="Holder distribution across directional tokens">
          {onchain?.tokens ? (() => {
            const longs = onchain.tokens.filter(t => t.symbol.endsWith("L")).reduce((s, t) => s + t.holders, 0);
            const shorts = onchain.tokens.filter(t => t.symbol.endsWith("S")).reduce((s, t) => s + t.holders, 0);
            const total = longs + shorts || 1;
            const longPct = Math.round((longs / total) * 100);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", gap: "16px" }}>
                  <Ring value={longs} max={total} label="Long Holders" color={accent} />
                  <Ring value={shorts} max={total} label="Short Holders" color="#f87171" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px" }}>
                    <div><div style={S.label}>Long Holders</div><div style={{ ...S.value, color: accent, fontSize: "20px" }}>{longs}</div></div>
                    <div><div style={S.label}>Short Holders</div><div style={{ ...S.value, color: "#f87171", fontSize: "20px" }}>{shorts}</div></div>
                  </div>
                </div>
                <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${longPct}%`, background: `linear-gradient(90deg, ${accent}, #00a876)`, borderRadius: "4px" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#5a9070" }}>
                  <span>{longPct}% LONG</span><span>{100 - longPct}% SHORT</span>
                </div>
              </div>
            );
          })() : <Skeleton h={150} />}
        </Card>

        <Card title="Top Wallet Rankings" subtitle="By combined SHIFT Points (position + social)">
          {leaderboard?.entries ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {leaderboard.entries.slice(0, 8).map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: i < 3 ? "rgba(0,200,150,0.04)" : "transparent", borderRadius: "8px" }}>
                  <div style={{ width: "20px", fontSize: "12px", fontWeight: 800, color: i === 0 ? "#fbbf24" : i === 1 ? "#9ca3af" : i === 2 ? "#cd7f32" : "#3a7060", textAlign: "center" }}>{i + 1}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#7ab09a", flex: 1 }}>{fmtWallet(e.wallet)}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{(e.totalSp || 0).toLocaleString()}</div>
                  <div style={{ fontSize: "10px", color: "#5a9070" }}>{(e.claimMultiplier || 1).toFixed(2)}x</div>
                </div>
              ))}
            </div>
          ) : <Skeleton h={200} />}
        </Card>
      </div>
    </div>
  );
}

// ─── ANALYTICS PAGE (RETIRED — soft retirement in Phase 2.1A) ────────────────
// This was the GA4 mirror — a 1-hour-stale cached copy of what GA4 native
// already shows authoritatively. UX Researcher flagged it as a trust
// collision (when the mirror disagrees with GA4, which one is right?).
// The function is intentionally kept here so the diff is easy to review
// and we can purge after Phase 2 stabilizes. It is no longer mounted —
// AnalyticsRedirectCard (below) renders instead.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AnalyticsPage({ data }: { data: HubData }) {
  const { ga4, analytics } = data;

  const properties = [
    { id: "G-16YK1Q7QHD", label: "SHIFT RWA (main)" },
    { id: "G-G40C983B82", label: "Airdrop Page" },
    { id: "G-85RCFPLKN9", label: "Shift Platform" },
    { id: "G-BGT758MJDT", label: "App Shift" },
    { id: "G-DK2TGBTKEL", label: "Loyalty" },
    { id: "G-RJK4KPQV09", label: "Snag Loyalty" },
    { id: "G-RERNZD3JLN", label: "Snag Page" },
  ];

  const cachedGA4 = {
    totalUsers: 14063,
    topPages: [
      { page: "/register", views: 6055 }, { page: "/airdrop", views: 2994 },
      { page: "/", views: 2211 }, { page: "/dashboard", views: 1719 }, { page: "/loyalty", views: 1084 },
    ],
  };

  const showGA4 = ga4?.available ? ga4 : null;
  const totalUsers = showGA4?.totals?.activeUsers || cachedGA4.totalUsers;

  // Normalize GA4 pages: API returns .pages with pagePath/screenPageViews
  const ga4TopPages = showGA4?.topPages?.length ? showGA4.topPages
    : (showGA4?.pages || []).map((p: any) => ({ page: p.pagePath, views: parseInt(p.screenPageViews) || 0 }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Permission notice if GA4 not connected */}
      {!showGA4 && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "12px", padding: "14px 18px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <div>
            <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: "13px" }}>GA4 Live Connection Pending</div>
            <div style={{ color: "#92400e", fontSize: "12px", marginTop: "4px" }}>
              GA4 data is unavailable. Check backend logs for auth errors. Displaying cached data.
            </div>
          </div>
        </div>
      )}

      {/* Summary KPIs — bounce rate & avg session duration are weighted from channels[] (backend doesn't aggregate on totals) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px" }}>
        {(() => {
          let totalSessions = 0;
          let weightedBounceSum = 0;
          let weightedDurationSum = 0;
          for (const ch of showGA4?.channels ?? []) {
            const s = parseInt(ch.sessions, 10);
            if (!Number.isFinite(s) || s <= 0) continue;
            totalSessions += s;
            if (ch.bounceRate !== undefined) {
              const br = parseFloat(ch.bounceRate);
              if (Number.isFinite(br)) weightedBounceSum += br * s;
            }
            if (ch.avgSessionDuration !== undefined) {
              const d = parseFloat(ch.avgSessionDuration);
              if (Number.isFinite(d)) weightedDurationSum += d * s;
            }
          }
          const weightedBounce = totalSessions > 0 ? weightedBounceSum / totalSessions : null;
          const weightedDuration = totalSessions > 0 ? weightedDurationSum / totalSessions : null;

          const cards = [
            { label: "Active Users (30d)", value: totalUsers.toLocaleString(), icon: "👤", c: accent },
            { label: "Sessions", value: (showGA4?.totals?.sessions || "—").toLocaleString(), icon: "🖱️", c: "#3b82f6" },
            { label: "Page Views", value: (showGA4?.totals?.screenPageViews || "—").toLocaleString(), icon: "📄", c: "#8b5cf6" },
            { label: "New Users", value: (showGA4?.totals?.newUsers || "—").toLocaleString(), icon: "🆕", c: "#f59e0b" },
            { label: "Bounce Rate", value: weightedBounce !== null ? `${(weightedBounce * 100).toFixed(1)}%` : "—", icon: "↩️", c: "#f87171" },
            { label: "Avg Session", value: weightedDuration !== null ? `${Math.floor(weightedDuration / 60)}m ${Math.floor(weightedDuration % 60)}s` : "—", icon: "⏱️", c: "#10b981" },
          ];
          return cards.map((k, i) => (
            <div key={i} style={{ ...S.card, padding: "18px" }}>
              <div style={{ fontSize: "20px", marginBottom: "8px" }}>{k.icon}</div>
              <div style={S.label}>{k.label}</div>
              <div style={{ ...S.value, color: k.c, fontSize: "22px" }}>
                {typeof k.value === "string" && k.value.endsWith("%")
                  ? <><span style={{ fontWeight: 400 }}>{k.value.slice(0, -1)}</span>%</>
                  : k.value}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* GA4 Properties */}
      <Card title="GA4 Property Coverage" subtitle="7 properties tracked across SHIFT channels">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
          {properties.map((p, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? accentBorder : "rgba(255,255,255,0.05)"}`, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#3a7060" }}>{p.id}</div>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === 0 ? "#fbbf24" : "rgba(255,255,255,0.1)" }} />
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{p.label}</div>
              {i === 0 && <div style={{ fontSize: "11px", color: accent, marginTop: "4px" }}>{totalUsers.toLocaleString()} users</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* Top Pages + Channels side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card title="Top Pages" subtitle="By page views — last 30 days">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(ga4TopPages.length > 0 ? ga4TopPages : cachedGA4.topPages).map((p: any, i: number) => {
              const maxViews = (ga4TopPages.length > 0 ? ga4TopPages : cachedGA4.topPages)[0]?.views || 1;
              const pct = Math.round(((p.views || p.views) / maxViews) * 100);
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#7ab09a", fontFamily: "monospace" }}>{p.page}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{(p.views).toLocaleString()}</span>
                  </div>
                  <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, #00a876)`, borderRadius: "2px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Traffic Channels" subtitle="Session distribution by source">
          {showGA4?.channels ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(() => {
                const channelTotal = showGA4.channels.reduce((sum, ch) => sum + (parseInt(ch.sessions, 10) || 0), 0);
                return showGA4.channels.map((ch, i) => {
                  const c = CHANNEL_COLORS[ch.channel] || "#6b7280";
                  const sessions = parseInt(ch.sessions, 10) || 0;
                  const pct = channelTotal > 0 ? Math.round((sessions * 100) / channelTotal) : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: c, flexShrink: 0 }} />
                          <span style={{ fontSize: "12px", color: "#7ab09a" }}>{ch.channel}</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "#5a9070" }}>{sessions.toLocaleString()}</span>
                          <span style={S.badge(c)}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: "2px" }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[["Organic Search", 42, "#00c896"], ["Direct", 28, "#3b82f6"], ["Referral", 18, "#8b5cf6"], ["Social", 8, "#f59e0b"], ["Email", 4, "#ec4899"]].map(([ch, pct, c], i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: c as string }} />
                      <span style={{ fontSize: "12px", color: "#7ab09a" }}>{ch}</span>
                    </div>
                    <span style={S.badge(c as string)}>{pct}%</span>
                  </div>
                  <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: c as string, borderRadius: "2px" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Conversion funnels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {(["aum", "holder", "referral"] as FunnelTab[]).map((tab) => {
          const labels: Record<FunnelTab, string> = { aum: "RWA Acquisition", holder: "Holder Onboarding", referral: "Brand Referrals" };
          const steps = analytics?.funnels?.[tab] || [];
          return (
            <Card key={tab} title={labels[tab]} subtitle="Conversion funnel">
              {steps.length > 0 ? <FunnelBar steps={steps} /> : <Skeleton h={140} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── STITCHED GA4 PAGE ────────────────────────────────────────────────────────
function StitchedPage({ data }: { data: HubData }) {
  const { analytics, admin } = data;
  const stitched = analytics?.metrics?.stitchedUsers || 0;
  const total = analytics?.metrics?.totalUsers || admin?.metrics?.total_users || 1;
  const pct = Math.round((stitched / total) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Stitching summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        {[
          { label: "Total Registered", value: total.toLocaleString(), icon: "👛", c: "#fff" },
          { label: "Identity Stitched", value: stitched.toLocaleString(), icon: "🔗", c: accent },
          { label: "Stitch Rate", value: `${pct}%`, icon: "📊", c: pct > 30 ? accent : "#f59e0b" },
          { label: "Unstitched Gap", value: (total - stitched).toLocaleString(), icon: "⚠️", c: "#f87171" },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card, padding: "20px" }}>
            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{k.icon}</div>
            <div style={S.label}>{k.label}</div>
            <div style={{ ...S.value, color: k.c, fontSize: "26px" }}>
              {typeof k.value === "string" && k.value.endsWith("%")
                ? <><span style={{ fontWeight: 400 }}>{k.value.slice(0, -1)}</span>%</>
                : k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Stitch architecture diagram */}
      <Card title="Identity Stitching Architecture" subtitle="How wallet ↔ GA4 ↔ Snag identities are merged">
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          {[
            { label: "Solana Wallet", icon: "🔐", desc: "Primary identity", color: "#8b5cf6" },
            { label: "GA4 Client ID", icon: "📊", desc: "Web session stitching", color: "#3b82f6" },
            { label: "Snag User ID", icon: "🏆", desc: "Loyalty & social", color: "#f59e0b" },
            { label: "Referral Code", icon: "🔗", desc: "Attribution chain", color: "#ec4899" },
          ].map((node, i) => (
            <React.Fragment key={i}>
              <div style={{ flex: "1 1 120px", background: `${node.color}10`, border: `1px solid ${node.color}30`, borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{node.icon}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>{node.label}</div>
                <div style={{ fontSize: "10px", color: "#5a9070" }}>{node.desc}</div>
              </div>
              {i < 3 && <div style={{ fontSize: "18px", color: "#3a7060", flexShrink: 0 }}>→</div>}
            </React.Fragment>
          ))}
        </div>

        <div style={S.divider} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "12px" }}>
          <div style={{ background: "rgba(0,200,150,0.04)", border: `1px solid ${accentBorder}`, borderRadius: "10px", padding: "14px" }}>
            <div style={{ color: accent, fontWeight: 700, marginBottom: "6px" }}>🔄 Stitch Trigger</div>
            <div style={{ color: "#5a9070" }}>Fires when user connects wallet on the airdrop portal. POST /api/analytics/stitch stores wallet ↔ GA4 client_id link.</div>
          </div>
          <div style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "10px", padding: "14px" }}>
            <div style={{ color: "#3b82f6", fontWeight: 700, marginBottom: "6px" }}>📡 GA4 Measurement Protocol</div>
            <div style={{ color: "#5a9070" }}>Server-side wallet_linked event dispatched to GA4 via Measurement Protocol to bridge web analytics with on-chain actions.</div>
          </div>
          <div style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", padding: "14px" }}>
            <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: "6px" }}>🏆 Snag Sync</div>
            <div style={{ color: "#5a9070" }}>SNAG user ID linked via wallet connect flow. Points and multipliers synced every 10 minutes via cron job.</div>
          </div>
        </div>
      </Card>

      {/* Real-time ledger */}
      <Card title="Real-Time Identity Ledger" subtitle={`Live stitched profiles · ${analytics?.recentStitched?.length || 0} records`}
        action={<div style={S.pill}>● LIVE STREAM</div>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${accentBorder}` }}>
                {["Timestamp", "Solana Wallet", "Snag User ID", "GA4 Client ID", "XP", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#3a7060", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analytics?.recentStitched?.length ? analytics.recentStitched.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: "11px 12px", color: "#5a9070", fontFamily: "monospace" }}>{new Date(r.updated_at).toLocaleString()}</td>
                  <td style={{ padding: "11px 12px", color: accent, fontFamily: "monospace" }}>{fmtWallet(r.wallet)}</td>
                  <td style={{ padding: "11px 12px", color: "#7ab09a", fontFamily: "monospace" }}>{r.snag_user_id ? fmtWallet(r.snag_user_id) : <span style={{ color: "#374151" }}>—</span>}</td>
                  <td style={{ padding: "11px 12px", color: "#5a9070", fontFamily: "monospace" }}>{r.ga_user_id ? r.ga_user_id.slice(0, 16) + "…" : <span style={{ color: "#374151" }}>—</span>}</td>
                  <td style={{ padding: "11px 12px", fontWeight: 700, color: "#fff" }}>{Number(r.total_xp).toLocaleString()}</td>
                  <td style={{ padding: "11px 12px" }}><span style={S.badge()}>{r.snag_user_id || r.ga_user_id ? "✓ Stitched" : "Partial"}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#3a7060" }}>
                  No stitched records yet. Records appear once users connect wallets on the airdrop portal.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── PORTFOLIOS PAGE ──────────────────────────────────────────────────────────
function PortfoliosPage({ data }: { data: HubData }) {
  const { onchain, leaderboard, analytics } = data;
  const funnelAum = analytics?.funnels?.aum || [];
  const top = leaderboard?.entries?.slice(0, 10) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Portfolio summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {[
          { label: "Unique Wallet Holders", value: onchain?.uniqueHolders?.toLocaleString() || "—", sub: "Across all 6 tokens", icon: "🔐" },
          { label: "Multi-Token Holders", value: onchain ? Math.max(0, onchain.totalHolderSlots - onchain.uniqueHolders).toLocaleString() : "—", sub: "Hold 2+ token types", icon: "🧩" },
          { label: "Total Volume Traded", value: analytics?.metrics ? fmtUSD(analytics.metrics.totalVolume) : "—", sub: "Cumulative position value", icon: "💰" },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card, padding: "22px" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{k.icon}</div>
            <div style={S.label}>{k.label}</div>
            <div style={{ ...S.value, color: accent }}>{k.value}</div>
            <div style={S.subval}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Token distribution + Leaderboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "16px" }}>
        <Card title="Token Holder Distribution" subtitle="How holders are spread across 6 tokens">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {onchain?.tokens ? onchain.tokens.sort((a, b) => b.holders - a.holders).map((t, i) => {
              const isLong = t.symbol.endsWith("L");
              const c = isLong ? accent : "#f87171";
              const pct = ((t.holders / (onchain.totalHolderSlots || 1)) * 100).toFixed(1);
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={S.badge(c)}>{t.symbol}</span>
                      <span style={{ fontSize: "11px", color: "#5a9070" }}>{t.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: c }}>{t.holders}</span>
                      <span style={{ fontSize: "10px", color: "#3a7060" }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: "3px", boxShadow: `0 0 6px ${c}60` }} />
                  </div>
                </div>
              );
            }) : <Skeleton h={200} />}
          </div>
        </Card>

        <Card title="Top 10 Wallets by SHIFT Points" subtitle="Combined position SP + social SP">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {top.length > 0 ? top.map((e, i) => {
              const maxSP = top[0]?.totalSp || 1;
              const pct = Math.round((e.totalSp / maxSP) * 100);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: i < 3 ? "rgba(0,200,150,0.04)" : "rgba(255,255,255,0.01)", borderRadius: "8px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: i === 0 ? "rgba(251,191,36,0.15)" : i === 1 ? "rgba(156,163,175,0.1)" : i === 2 ? "rgba(205,127,50,0.1)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: i === 0 ? "#fbbf24" : i === 1 ? "#9ca3af" : i === 2 ? "#cd7f32" : "#3a7060", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#7ab09a" }}>{fmtWallet(e.wallet)}</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#fff" }}>{(e.totalSp || 0).toLocaleString()} SP</span>
                    </div>
                    <div style={{ height: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, #00a876)`, borderRadius: "2px" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: "10px", color: "#3a7060", flexShrink: 0 }}>{(e.claimMultiplier || 1).toFixed(2)}x</div>
                </div>
              );
            }) : Array(8).fill(0).map((_, i) => <Skeleton key={i} h={36} />)}
          </div>
        </Card>
      </div>

      {/* Acquisition funnel detail */}
      <Card title="Full Acquisition Funnel" subtitle="From first visit to active long-term holder">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>
          <FunnelBar steps={funnelAum.length > 0 ? funnelAum : [
            { name: "Registered Users", count: analytics?.metrics?.totalUsers || 0 },
            { name: "Identity Linked", count: analytics?.metrics?.stitchedUsers || 0 },
            { name: "Opened Position", count: analytics?.metrics?.activeHolders || 0 },
            { name: "Active Holder", count: analytics?.metrics?.activeHolders || 0 },
          ]} />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {funnelAum.map((s, i) => i > 0 && funnelAum[i - 1] && (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accentBorder}`, borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "10px", color: "#3a7060", marginBottom: "4px" }}>{funnelAum[i - 1].name} → {s.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                    {s.count.toLocaleString()} converted
                  </span>
                  <span style={S.badge()}>
                    {funnelAum[i - 1].count > 0 ? Math.round((s.count / funnelAum[i - 1].count) * 100) : 0}% rate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminSystemPage({ data }: { data: HubData }) {
  const { admin, analytics, onchain } = data;
  const m = admin?.metrics;

  const endpointHealth = [
    { name: "/api/admin/dashboard", status: !!admin, latency: "~200ms" },
    { name: "/api/admin/onchain-holders", status: !!onchain, latency: "~1.2s" },
    { name: "/api/analytics/dashboard-stats", status: !!analytics, latency: "~350ms" },
    { name: "/api/leaderboard", status: true, latency: "~180ms" },
    { name: "/api/analytics/ga4", status: false, latency: "Pending access" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* System health */}
      <Card title="System Health" subtitle="Live API endpoint status">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {endpointHealth.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: `1px solid ${e.status ? accentBorder : "rgba(248,113,113,0.2)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.status ? accent : "#f87171", boxShadow: e.status ? `0 0 8px ${accent}` : "0 0 8px #f87171", flexShrink: 0 }} />
                <code style={{ fontSize: "12px", color: "#7ab09a" }}>{e.name}</code>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#3a7060" }}>{e.latency}</span>
                <span style={S.badge(e.status ? accent : "#f87171")}>{e.status ? "OK" : "Pending"}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* DB Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px" }}>
        {[
          { label: "Total Users (DB)", value: m?.total_users?.toLocaleString() || "—" },
          { label: "Total XP", value: m?.total_xp ? `${(m.total_xp / 1_000_000).toFixed(2)}M` : "—" },
          { label: "Badges Awarded", value: m?.badge_count?.toLocaleString() || "—" },
          { label: "HOF Count", value: m?.hof_count?.toLocaleString() || "—" },
          { label: "Avg Multiplier", value: m?.avg_multiplier ? `${m.avg_multiplier.toFixed(4)}x` : "—" },
          { label: "Stitched Users", value: analytics?.metrics?.stitchedUsers?.toLocaleString() || "—" },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card, padding: "18px" }}>
            <div style={S.label}>{k.label}</div>
            <div style={{ ...S.value, fontSize: "22px", color: accent }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Infrastructure info */}
      <Card title="Infrastructure" subtitle="Deployment environment">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
          {[
            ["Backend", "Render (Node.js 20, Express 4)"],
            ["Database", "Render PostgreSQL 16 — Ohio"],
            ["Frontend", "Vercel (Next.js, App Router)"],
            ["On-chain", "Solana Mainnet via Helius RPC"],
            ["Loyalty", "SNAG Solutions API"],
            ["Analytics", "GA4 Data API (7 properties)"],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
              <span style={{ color: "#3a7060" }}>{k}</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent activity */}
      <Card title="Recent Admin Activity" subtitle="Last logged admin actions">
        {admin?.recentActivity?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {admin.recentActivity.map((a, i) => (
              <div key={i} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={S.badge()}>{a.action}</span>
                  <span style={{ fontSize: "11px", color: "#5a9070", marginLeft: "8px" }}>{a.resource_type}</span>
                </div>
                <span style={{ fontSize: "10px", color: "#3a7060", fontFamily: "monospace" }}>{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : <div style={{ color: "#3a7060", fontSize: "12px", textAlign: "center", padding: "20px" }}>No recent activity logged</div>}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HUB SHELL
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS: { page: HubPage; label: string; icon: React.ReactNode; audience: string }[] = [
  { page: "overview", label: "Dashboard", icon: "◈", audience: "All teams" },
  { page: "markets", label: "Markets", icon: "📈", audience: "Finance · BD" },
  { page: "analytics", label: "Analytics", icon: "📊", audience: "Marketing" },
  { page: "stitched", label: "Stitched GA4", icon: "🔗", audience: "Dev · Marketing" },
  { page: "portfolios", label: "Portfolios", icon: "💼", audience: "Finance" },
  { page: "admin", label: "Admin", icon: "⚙️", audience: "Engineering" },
  { page: "utm", label: "UTM", icon: <Tag size={14} weight="bold" />, audience: "Marketing · Engineering" },
];

function DataHubPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAdminAuth();
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<HubPage>("overview");
  const initialView = ((): TopView => {
    const v = searchParams?.get('view');
    return isValidTopView(v) ? v : 'pulse';  // Platform default — Pulse "what changed" overview (Phase 2 IA redesign)
  })();
  const [topView, setTopView] = useState<TopView>(initialView);
  // HARVEST-006+008: keep topView in sync with `?view=` writes from drill-down
  // links (KOL leaderboard row → Users, whale row → Users, etc.). Without this
  // the URL updates but the visible tab stays put until the user clicks it.
  useSyncTopViewFromUrl(searchParams, topView, setTopView);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist topView in URL so it survives AuthGate remounts (kills the tab-reset-on-auto-refresh bug)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') !== topView) {
      url.searchParams.set('view', topView);
      window.history.replaceState(null, '', url.toString());
    }
  }, [topView]);

  const [data, setData] = useState<HubData>({
    admin: null, onchain: null, analytics: null, leaderboard: null,
    ga4: null, kpis: null, lastRefresh: null, loading: true, errors: {},
  });

  const fetchAll = useCallback(async () => {
    setSyncing(true);
    const errs: Record<string, string> = {};
    const [adminRes, onchainRes, analyticsRes, leaderboardRes, ga4Res] = await Promise.allSettled([
      fetch(`${API}/api/admin/dashboard`, { headers: H }).then(r => r.json()),
      fetch(`${API}/api/admin/onchain-holders`, { headers: H }).then(r => r.json()),
      fetch(`${API}/api/analytics/dashboard-stats`, { headers: H }).then(r => r.json()),
      fetch(`${API}/api/leaderboard?limit=20`, { headers: H }).then(r => r.json()),
      fetch(`${API}/api/analytics/ga4`, { headers: H }).then(r => r.json()).catch(() => null),
    ]);

    const get = <T,>(res: PromiseSettledResult<T>, key: string): T | null => {
      if (res.status === "fulfilled") return res.value;
      errs[key] = "fetch failed";
      return null;
    };

    setData(prev => ({
      ...prev,
      admin: get(adminRes, "admin"),
      onchain: get(onchainRes, "onchain"),
      analytics: get(analyticsRes, "analytics"),
      leaderboard: (() => {
        const raw: any = get(leaderboardRes, "leaderboard");
        if (!raw) return null;
        // API returns { leaderboard: [...] }, component expects { entries: [...] }
        const arr = Array.isArray(raw) ? raw : (raw.leaderboard || raw.data || []);
        return { entries: arr, count: arr.length };
      })(),
      ga4: get(ga4Res, "ga4"),
      lastRefresh: new Date(),
      loading: false,
      errors: errs,
    }));
    setLastSync(new Date());
    setSyncing(false);
  }, []);

  useEffect(() => {
    if (authed) {
      fetchAll();
      pollRef.current = setInterval(fetchAll, 30_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authed, fetchAll]);

  useEffect(() => {
    if (isAuthenticated) setAuthed(true);
  }, [isAuthenticated]);

  if (!authed) return <AuthGate onAuth={() => setAuthed(true)} />;

  return (
    <HubSessionProvider initialView={topView}>
      <FlagAffordanceStyles />
      <DataHubAuthedShell
        topView={topView}
        setTopView={setTopView}
        page={page}
        setPage={setPage}
        data={data}
        lastSync={lastSync}
        syncing={syncing}
        fetchAll={fetchAll}
      />
    </HubSessionProvider>
  );
}

interface DataHubAuthedShellProps {
  topView: TopView;
  setTopView: (v: TopView) => void;
  page: HubPage;
  setPage: (p: HubPage) => void;
  data: HubData;
  lastSync: Date | null;
  syncing: boolean;
  fetchAll: () => Promise<void>;
}

function DataHubAuthedShell({
  topView,
  setTopView,
  page,
  setPage,
  data,
  lastSync,
  syncing,
  fetchAll,
}: DataHubAuthedShellProps) {
  const { recordEvent } = useHubSession();

  // tab_open / tab_close telemetry — wire to the topView changeHandler.
  // Fire-and-forget; setTopView is synchronous so the URL persistence still
  // runs from the parent's useEffect.
  const handleChangeView = useCallback(
    (next: TopView) => {
      if (next === topView) return;
      recordEvent('tab_close', { tab: topView, metadata: { to: next } });
      recordEvent('tab_open', { tab: next, metadata: { from: topView } });
      setTopView(next);
    },
    [topView, setTopView, recordEvent],
  );

  // card_click telemetry on the legacy Raw Data force-sync action.
  const handleRawRefresh = useCallback(() => {
    recordEvent('card_click', { tab: 'raw', metadata: { target: 'refresh' } });
    fetchAll();
  }, [recordEvent, fetchAll]);

  const pageComponent: Record<HubPage, React.ReactNode> = {
    overview: <OverviewPage data={data} />,
    markets: <MarketsPage data={data} />,
    // Phase 2.1A — AnalyticsPage (above) is the legacy GA4 mirror. It's
    // intentionally not deleted (soft retirement). AnalyticsRedirectCard
    // replaces it in the UI and points operators to GA4 native.
    analytics: <AnalyticsRedirectCard />,
    stitched: <StitchedPage data={data} />,
    portfolios: <PortfoliosPage data={data} />,
    admin: <AdminSystemPage data={data} />,
    utm: <UtmGovernancePanel />,
  };

  const currentNav = NAV_ITEMS.find(n => n.page === page)!;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030d0a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes spin { to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(0,200,150,0.3); border-radius: 2px; }
        button:hover { opacity: 0.9; }
        a { text-decoration: none; }
      `}</style>

      <LayoutShell activeView={topView} onChangeView={handleChangeView}>
        {topView === 'pulse' && <PulseView />}
        {topView === 'funnels' && <FunnelsView />}
        {topView === 'attribution' && <AttributionView />}
        {topView === 'cohorts' && <CohortsView />}
        {topView === 'users' && <UsersView />}
        {topView === 'raw' && (
          <RawDataView>
            <div style={{ minHeight: "100vh", background: bg, color: "#fff" }}>
        {/* ── Top Bar ──────────────────────────────────────────────── */}
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(3,13,10,0.95)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${accentBorder}` }}>
          <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: "0", height: "56px" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginRight: "32px", flexShrink: 0 }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: accentDim, border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "16px", color: accent }}>S</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>SHIFT RWA</div>
                <div style={{ fontSize: "9px", color: "#3a7060", letterSpacing: "0.08em" }}>OMNICHANNEL HUB</div>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, overflowX: "auto" }}>
              {NAV_ITEMS.map(n => (
                <button key={n.page} onClick={() => setPage(n.page)} style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px",
                  background: page === n.page ? accentDim : "transparent",
                  color: page === n.page ? accent : "#5a9070",
                  border: page === n.page ? `1px solid ${accentBorder}` : "1px solid transparent",
                  borderRadius: "8px", fontSize: "12px", fontWeight: page === n.page ? 700 : 500,
                  cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  <span>{n.icon}</span> {n.label}
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "16px", flexShrink: 0 }}>
              {lastSync && <div style={{ fontSize: "10px", color: "#3a7060" }}>{lastSync.toLocaleTimeString()}</div>}
              <button onClick={handleRawRefresh} disabled={syncing} style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px",
                background: accentDim, color: accent, border: `1px solid ${accentBorder}`,
                borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>
                <span style={{ display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none" }}>⚡</span>
                {syncing ? "Syncing…" : "Force Sync"}
              </button>
              <div style={S.pill}>● LIVE</div>
            </div>
          </div>
        </div>

        {/* ── Page Header ───────────────────────────────────────────── */}
        <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 24px 0" }}>
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center" }}>{currentNav.icon}</span>
              {currentNav.label}
            </h1>
            <p style={{ color: "#3a7060", fontSize: "13px", marginTop: "4px" }}>
              {currentNav.audience}
              {page === "utm" ? " · UTM governance · campaigns log + violations" : " · 4 live data feeds · Auto-refresh every 30s"}
            </p>
          </div>

          {/* ── Page Content ───────────────────────────────────────────── */}
          <div style={{ paddingBottom: "48px" }}>
            {/* UTM panel manages its own loading/error state (it doesn't depend on HubData feeds). */}
            {data.loading && page !== "utm" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[180, 300, 240].map((h, i) => <Skeleton key={i} h={h} />)}
              </div>
            ) : pageComponent[page]}
          </div>
        </div>
      </div>
          </RawDataView>
        )}
      </LayoutShell>
    </>
  );
}

// Wrap in Suspense — Next.js 16 requires useSearchParams() to be inside a Suspense boundary
// so the static shell can prerender while the search-params-dependent subtree streams in.
export default function DataHubPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: bg }} />}>
      <DataHubPageInner />
    </Suspense>
  );
}
